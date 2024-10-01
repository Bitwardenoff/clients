import { HttpTransportType, HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import { Observable, Subscription } from "rxjs";

import { ApiService } from "../../../abstractions/api.service";
import { NotificationResponse } from "../../../models/response/notification.response";
import { UserId } from "../../../types/guid";
import { LogService } from "../../abstractions/log.service";

const MIN_RECONNECT_TIME = 120000;
const MAX_RECONNECT_TIME = 300000;

export type Heartbeat = { type: "Heartbeat" };
export type ReceiveMessage = { type: "ReceiveMessage"; message: NotificationResponse };

export type SignalRNotification = Heartbeat | ReceiveMessage;

export class SignalRConnectionService {
  constructor(
    private readonly apiService: ApiService,
    private readonly logService: LogService,
  ) {}

  connect$(userId: UserId, notificationsUrl: string) {
    return new Observable<SignalRNotification>((subsciber) => {
      const connection = new HubConnectionBuilder()
        .withUrl(notificationsUrl + "/hub", {
          accessTokenFactory: () => this.apiService.getActiveBearerToken(),
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .withHubProtocol(new MessagePackHubProtocol())
        .build();

      connection.on("ReceiveMessage", (data: any) => {
        subsciber.next({ type: "ReceiveMessage", message: data });
      });

      connection.on("Heartbeat", () => {
        subsciber.next({ type: "Heartbeat" });
      });

      let reconnectSubscription: Subscription | null = null;

      // Create schedule reconnect function
      const sheduleReconnect = (): Subscription => {
        if (
          connection == null ||
          connection.state !== HubConnectionState.Disconnected ||
          (reconnectSubscription != null && !reconnectSubscription.closed)
        ) {
          return Subscription.EMPTY;
        }

        // TODO: Schedule reconnect with scheduler
        const randomTime = this.random();
        const timeoutHandler = setTimeout(() => {
          connection
            .start()
            .then(() => (reconnectSubscription = null))
            .catch((error) => {
              reconnectSubscription = sheduleReconnect();
            });
        }, randomTime);

        reconnectSubscription = new Subscription(() => clearTimeout(timeoutHandler));
      };

      connection.onclose((error) => {
        // TODO: Do anything with error?
        reconnectSubscription = sheduleReconnect();
      });

      // Start connection
      connection.start().catch((error) => {
        reconnectSubscription = sheduleReconnect();
      });

      return () => {
        connection?.stop().catch((error) => {
          this.logService.error("Error while stopping SignalR connection", error);
          // TODO: Does calling stop call `onclose`?
          reconnectSubscription?.unsubscribe();
        });
      };
    });
  }

  private random() {
    return (
      Math.floor(Math.random() * (MAX_RECONNECT_TIME - MIN_RECONNECT_TIME + 1)) + MIN_RECONNECT_TIME
    );
  }
}
