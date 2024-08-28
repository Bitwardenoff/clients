use std::{
    collections::HashMap,
    sync::{atomic::AtomicU64, Arc, Mutex},
};

use log::{error, info, warn};
use registration::{PasskeyRegistrationRequest, PreparePasskeyRegistrationCallback};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

uniffi::setup_scaffolding!();

mod registration;

#[derive(uniffi::Enum, Debug, Serialize, Deserialize)]
pub enum UserVerification {
    Preferred,
    Required,
    Discouraged,
}

#[derive(uniffi::Error, Serialize, Deserialize)]
pub enum BitwardenError {
    Internal(String),
}

// TODO: These have to be named differently than the actual Uniffi traits otherwise
// the generated code will lead to ambiguous trait implementations
// These are only used internally, so it doesn't matter that much
trait Callback: Send + Sync {
    fn complete(&self, credential: serde_json::Value) -> Result<(), serde_json::Error>;
    fn error(&self, error: BitwardenError);
}

#[derive(uniffi::Object)]
pub struct MacOSProviderClient {
    to_server_send: tokio::sync::mpsc::Sender<String>,

    // We need to keep track of the callbacks so we can call them when we receive a response
    response_callbacks_counter: AtomicU64,
    response_callbacks_queue: Arc<Mutex<HashMap<u64, Box<dyn Callback>>>>,
}

#[uniffi::export]
impl MacOSProviderClient {
    #[uniffi::constructor]
    pub fn connect() -> Self {
        let _ = oslog::OsLogger::new("com.bitwarden.desktop.autofill-extension")
            .level_filter(log::LevelFilter::Trace)
            .init();

        let (from_server_send, mut from_server_recv) = tokio::sync::mpsc::channel(32);
        let (to_server_send, to_server_recv) = tokio::sync::mpsc::channel(32);

        let client = MacOSProviderClient {
            to_server_send,
            response_callbacks_counter: AtomicU64::new(0),
            response_callbacks_queue: Arc::new(Mutex::new(HashMap::new())),
        };

        let path = desktop_core::ipc::path("autofill");

        let queue = client.response_callbacks_queue.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Can't create runtime");

            rt.spawn(desktop_core::ipc::client::connect(
                path,
                from_server_send,
                to_server_recv,
            ));

            rt.block_on(async move {
                while let Some(message) = from_server_recv.recv().await {
                    match serde_json::from_str::<SerializedMessage>(&message) {
                        Ok(SerializedMessage::Connected) => {
                            info!("Connected to server");
                        }
                        Ok(SerializedMessage::Disconnected) => {
                            info!("Disconnected from server");
                        }
                        Ok(SerializedMessage::Message {
                            sequence_number,
                            value,
                        }) => match queue.lock().unwrap().remove(&sequence_number) {
                            Some(cb) => match value {
                                Ok(value) => {
                                    if let Err(e) = cb.complete(value) {
                                        error!("Error deserializing message: {}", e);
                                    }
                                }
                                Err(e) => cb.error(e),
                            },
                            None => {
                                error!("No callback found for sequence number: {}", sequence_number)
                            }
                        },
                        Err(e) => {
                            error!("Error deserializing message: {}", e);
                        }
                    };
                }
            });
        });

        client
    }

    pub fn prepare_passkey_registration(
        &self,
        request: PasskeyRegistrationRequest,
        callback: Arc<dyn PreparePasskeyRegistrationCallback>,
    ) {
        warn!("prepare_passkey_registration: {:?}", request);

        self.send_message(request, Box::new(callback));
    }
}
#[derive(Serialize, Deserialize)]
#[serde(tag = "command")]
enum SerializedMessage {
    Connected,
    Disconnected,
    Message {
        sequence_number: u64,
        value: Result<serde_json::Value, BitwardenError>,
    },
}

impl MacOSProviderClient {
    fn add_callback(&self, callback: Box<dyn Callback>) -> u64 {
        let sequence_number = self
            .response_callbacks_counter
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

        self.response_callbacks_queue
            .lock()
            .unwrap()
            .insert(sequence_number, callback);

        sequence_number
    }

    fn send_message(
        &self,
        message: impl Serialize + DeserializeOwned,
        callback: Box<dyn Callback>,
    ) {
        let sequence_number = self.add_callback(callback);

        let message = serde_json::to_string(&SerializedMessage::Message {
            sequence_number,
            value: Ok(serde_json::to_value(message).unwrap()),
        })
        .expect("Can't serialize message");

        if let Err(e) = self.to_server_send.blocking_send(message) {
            // Make sure we remove the callback from the queue if we can't send the message
            if let Some(cb) = self
                .response_callbacks_queue
                .lock()
                .unwrap()
                .remove(&sequence_number)
            {
                cb.error(BitwardenError::Internal(format!(
                    "Error sending message: {}",
                    e
                )));
            }
        }
    }
}
