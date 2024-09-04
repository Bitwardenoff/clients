#[macro_use]
extern crate napi_derive;

#[napi]
pub mod passwords {
    /// Fetch the stored password from the keychain.
    #[napi]
    pub async fn get_password(service: String, account: String) -> napi::Result<String> {
        desktop_core::password::get_password(&service, &account)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Fetch the stored password from the keychain that was stored with Keytar.
    #[napi]
    pub async fn get_password_keytar(service: String, account: String) -> napi::Result<String> {
        desktop_core::password::get_password_keytar(&service, &account)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Save the password to the keychain. Adds an entry if none exists otherwise updates the existing entry.
    #[napi]
    pub async fn set_password(
        service: String,
        account: String,
        password: String,
    ) -> napi::Result<()> {
        desktop_core::password::set_password(&service, &account, &password)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Delete the stored password from the keychain.
    #[napi]
    pub async fn delete_password(service: String, account: String) -> napi::Result<()> {
        desktop_core::password::delete_password(&service, &account)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}

#[napi]
pub mod biometrics {
    use desktop_core::biometric::{Biometric, BiometricTrait};

    // Prompt for biometric confirmation
    #[napi]
    pub async fn prompt(
        hwnd: napi::bindgen_prelude::Buffer,
        message: String,
    ) -> napi::Result<bool> {
        Biometric::prompt(hwnd.into(), message).map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn available() -> napi::Result<bool> {
        Biometric::available().map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn set_biometric_secret(
        service: String,
        account: String,
        secret: String,
        key_material: Option<KeyMaterial>,
        iv_b64: String,
    ) -> napi::Result<String> {
        Biometric::set_biometric_secret(
            &service,
            &account,
            &secret,
            key_material.map(|m| m.into()),
            &iv_b64,
        )
        .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn get_biometric_secret(
        service: String,
        account: String,
        key_material: Option<KeyMaterial>,
    ) -> napi::Result<String> {
        let result =
            Biometric::get_biometric_secret(&service, &account, key_material.map(|m| m.into()))
                .map_err(|e| napi::Error::from_reason(e.to_string()));
        result
    }

    /// Derives key material from biometric data. Returns a string encoded with a
    /// base64 encoded key and the base64 encoded challenge used to create it
    /// separated by a `|` character.
    ///
    /// If the iv is provided, it will be used as the challenge. Otherwise a random challenge will be generated.
    ///
    /// `format!("<key_base64>|<iv_base64>")`
    #[napi]
    pub async fn derive_key_material(iv: Option<String>) -> napi::Result<OsDerivedKey> {
        Biometric::derive_key_material(iv.as_deref())
            .map(|k| k.into())
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi(object)]
    pub struct KeyMaterial {
        pub os_key_part_b64: String,
        pub client_key_part_b64: Option<String>,
    }

    impl From<KeyMaterial> for desktop_core::biometric::KeyMaterial {
        fn from(km: KeyMaterial) -> Self {
            desktop_core::biometric::KeyMaterial {
                os_key_part_b64: km.os_key_part_b64,
                client_key_part_b64: km.client_key_part_b64,
            }
        }
    }

    #[napi(object)]
    pub struct OsDerivedKey {
        pub key_b64: String,
        pub iv_b64: String,
    }

    impl From<desktop_core::biometric::OsDerivedKey> for OsDerivedKey {
        fn from(km: desktop_core::biometric::OsDerivedKey) -> Self {
            OsDerivedKey {
                key_b64: km.key_b64,
                iv_b64: km.iv_b64,
            }
        }
    }
}

#[napi]
pub mod clipboards {
    #[napi]
    pub async fn read() -> napi::Result<String> {
        desktop_core::clipboard::read().map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn write(text: String, password: bool) -> napi::Result<()> {
        desktop_core::clipboard::write(&text, password)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}

#[napi]
pub mod autofill {
    #[napi]
    pub async fn run_command(value: String) -> napi::Result<String> {
        desktop_core::autofill::run_command(value)
            .await
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    use desktop_core::ipc::server::{Message, MessageType};
    use napi::threadsafe_function::{
        ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode,
    };
    use serde::{de::DeserializeOwned, Deserialize, Serialize};

    #[napi(object)]
    pub struct IpcMessage {
        pub client_id: u32,
        pub kind: IpcMessageType,
        pub message: String,
    }

    #[napi]
    pub enum IpcMessageType {
        Connected,
        Disconnected,
        Message,
    }

    impl From<Message> for IpcMessage {
        fn from(message: Message) -> Self {
            IpcMessage {
                client_id: message.client_id,
                kind: message.kind.into(),
                message: message.message,
            }
        }
    }

    impl From<MessageType> for IpcMessageType {
        fn from(message_type: MessageType) -> Self {
            match message_type {
                MessageType::Connected => IpcMessageType::Connected,
                MessageType::Disconnected => IpcMessageType::Disconnected,
                MessageType::Message => IpcMessageType::Message,
            }
        }
    }

    #[derive(Debug, serde::Serialize, serde:: Deserialize)]
    pub enum BitwardenError {
        Internal(String),
    }

    #[napi(string_enum)]
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub enum UserVerification {
        #[napi(value = "preferred")]
        Preferred,
        #[napi(value = "required")]
        Required,
        #[napi(value = "discouraged")]
        Discouraged,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(bound = "T: Serialize + DeserializeOwned")]
    pub struct PasskeyMessage<T: Serialize + DeserializeOwned> {
        pub sequence_number: u32,
        pub value: Result<T, BitwardenError>,
    }

    #[napi(object)]
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PasskeyRegistrationRequest {
        pub relying_party_id: String,
        pub user_name: String,
        pub user_handle: Vec<u8>,
        pub client_data_hash: Vec<u8>,
        pub user_verification: UserVerification,
        pub supported_algorithms: Vec<i32>,
    }

    #[napi(object)]
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PasskeyRegistrationResponse {
        pub relying_party_id: String,
        pub client_data_hash: Vec<u8>,
        pub credential_id: Vec<u8>,
        pub attestation_object: Vec<u8>,
    }

    #[napi(object)]
    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PasskeyAssertionRequest {
        pub relying_party_id: String,
        pub credential_id: Vec<u8>,
        pub user_name: String,
        pub user_handle: Vec<u8>,
        pub record_identifier: Option<String>,
        pub client_data_hash: Vec<u8>,
        pub user_verification: UserVerification,
    }

    #[napi(object)]
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PasskeyAssertionResponse {
        pub relying_party_id: String,
        pub user_handle: Vec<u8>,
        pub signature: Vec<u8>,
        pub client_data_hash: Vec<u8>,
        pub authenticator_data: Vec<u8>,
        pub credential_id: Vec<u8>,
    }

    #[napi]
    pub struct IpcServer {
        server: desktop_core::ipc::server::Server,
    }

    #[napi]
    impl IpcServer {
        /// Create and start the IPC server without blocking.
        ///
        /// @param name The endpoint name to listen on. This name uniquely identifies the IPC connection and must be the same for both the server and client.
        /// @param callback This function will be called whenever a message is received from a client.
        #[napi(factory)]
        pub async fn listen(
            name: String,
            // Ideally we'd have a single callback that has an enum containing the request values,
            // but NAPI doesn't support that just yet
            #[napi(
                ts_arg_type = "(error: null | Error, clientId: number, sequenceNumber: number, message: PasskeyRegistrationRequest) => void"
            )]
            registration_callback: ThreadsafeFunction<
                (u32, u32, PasskeyRegistrationRequest),
                ErrorStrategy::CalleeHandled,
            >,
            #[napi(
                ts_arg_type = "(error: null | Error, clientId: number, sequenceNumber: number, message: PasskeyAssertionRequest) => void"
            )]
            assertion_callback: ThreadsafeFunction<
                (u32, u32, PasskeyAssertionRequest),
                ErrorStrategy::CalleeHandled,
            >,
        ) -> napi::Result<Self> {
            let (send, mut recv) = tokio::sync::mpsc::channel::<Message>(32);
            tokio::spawn(async move {
                while let Some(Message {
                    client_id,
                    kind,
                    message,
                }) = recv.recv().await
                {
                    match kind {
                        // TODO: We're ignoring the connection and disconnection messages for now
                        MessageType::Connected | MessageType::Disconnected => continue,
                        MessageType::Message => {
                            match serde_json::from_str::<PasskeyMessage<PasskeyAssertionRequest>>(
                                &message,
                            ) {
                                Ok(msg) => {
                                    let value = msg
                                        .value
                                        .map(|value| (client_id, msg.sequence_number, value))
                                        .map_err(|e| napi::Error::from_reason(format!("{e:?}")));

                                    assertion_callback
                                        .call(value, ThreadsafeFunctionCallMode::NonBlocking);
                                    continue;
                                }
                                Err(e) => {
                                    println!("[ERROR] Error deserializing message1: {e}");
                                }
                            }

                            match serde_json::from_str::<PasskeyMessage<PasskeyRegistrationRequest>>(
                                &message,
                            ) {
                                Ok(msg) => {
                                    let value = msg
                                        .value
                                        .map(|value| (client_id, msg.sequence_number, value))
                                        .map_err(|e| napi::Error::from_reason(format!("{e:?}")));
                                    registration_callback
                                        .call(value, ThreadsafeFunctionCallMode::NonBlocking);
                                    continue;
                                }
                                Err(e) => {
                                    println!("[ERROR] Error deserializing message2: {e}");
                                }
                            }

                            println!("[ERROR] Received an unknown message2: {message:?}");
                        }
                    }
                }
            });

            let path = desktop_core::ipc::path(&name);

            let server = desktop_core::ipc::server::Server::start(&path, send).map_err(|e| {
                napi::Error::from_reason(format!(
                    "Error listening to server - Path: {path:?} - Error: {e} - {e:?}"
                ))
            })?;

            Ok(IpcServer { server })
        }

        /// Stop the IPC server.
        #[napi]
        pub fn stop(&self) -> napi::Result<()> {
            self.server.stop();
            Ok(())
        }

        #[napi]
        pub fn complete_registration(
            &self,
            client_id: u32,
            sequence_number: u32,
            response: PasskeyRegistrationResponse,
        ) -> napi::Result<u32> {
            let message = PasskeyMessage {
                sequence_number,
                value: Ok(response),
            };
            self.send(client_id, serde_json::to_string(&message).unwrap())
        }

        #[napi]
        pub fn complete_assertion(
            &self,
            client_id: u32,
            sequence_number: u32,
            response: PasskeyAssertionResponse,
        ) -> napi::Result<u32> {
            let message = PasskeyMessage {
                sequence_number,
                value: Ok(response),
            };
            self.send(client_id, serde_json::to_string(&message).unwrap())
        }

        #[napi]
        pub fn complete_error(
            &self,
            client_id: u32,
            sequence_number: u32,
            error: String,
        ) -> napi::Result<u32> {
            let message: PasskeyMessage<()> = PasskeyMessage {
                sequence_number,
                value: Err(BitwardenError::Internal(error)),
            };
            self.send(client_id, serde_json::to_string(&message).unwrap())
        }

        // TODO: Add a way to send a message to a specific client?
        fn send(&self, _client_id: u32, message: String) -> napi::Result<u32> {
            self.server
                .send(message)
                .map_err(|e| {
                    napi::Error::from_reason(format!("Error sending message - Error: {e} - {e:?}"))
                })
                // NAPI doesn't support u64 or usize, so we need to convert to u32
                .map(|u| u32::try_from(u).unwrap_or_default())
        }
    }
}
