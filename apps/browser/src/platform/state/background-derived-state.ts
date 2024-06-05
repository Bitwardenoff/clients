import { Observable, Subscription, tap } from "rxjs";
import { Jsonify } from "type-fest";

import { Utils } from "@bitwarden/common/platform/misc/utils";
import { DeriveDefinition } from "@bitwarden/common/platform/state";
// eslint-disable-next-line import/no-restricted-paths -- extending this class for this client
import { DefaultDerivedState } from "@bitwarden/common/platform/state/implementations/default-derived-state";
import { DerivedStateDependencies } from "@bitwarden/common/types/state";

import { BrowserApi } from "../browser/browser-api";

export class BackgroundDerivedState<
  TFrom,
  TTo,
  TDeps extends DerivedStateDependencies,
> extends DefaultDerivedState<TFrom, TTo, TDeps> {
  private portSubscriptions: Map<chrome.runtime.Port, Subscription> = new Map();

  constructor(
    parentState$: Observable<TFrom>,
    deriveDefinition: DeriveDefinition<TFrom, TTo, TDeps>,
    portName: string,
    dependencies: TDeps,
  ) {
    super(parentState$, deriveDefinition, dependencies);

    // listen for foreground derived states to connect
    BrowserApi.addListener(chrome.runtime.onConnect, (port) => {
      if (port.name !== portName) {
        return;
      }

      const listenerCallback = this.onMessageFromForeground.bind(this);
      port.onDisconnect.addListener(() => {
        this.portSubscriptions.get(port)?.unsubscribe();
        this.portSubscriptions.delete(port);
        port.onMessage.removeListener(listenerCallback);
      });
      port.onMessage.addListener(listenerCallback);

      const stateSubscription = this.state$
        .pipe(
          tap((state) => {
            this.sendMessage(
              {
                action: "nextState",
                data: JSON.stringify(state),
                id: Utils.newGuid(),
              },
              port,
            );
          }),
        )
        .subscribe();

      this.portSubscriptions.set(port, stateSubscription);
    });
  }

  private async onMessageFromForeground(message: DerivedStateMessage, port: chrome.runtime.Port) {
    if (message.originator === "background") {
      return;
    }

    switch (message.action) {
      case "nextState": {
        const dataObj = JSON.parse(message.data) as Jsonify<TTo>;
        const data = this.deriveDefinition.deserialize(dataObj);
        await this.forceValue(data);
        this.sendResponse(
          message,
          {
            action: "resolve",
          },
          port,
        );
        break;
      }
    }
  }

  private sendResponse(
    originalMessage: DerivedStateMessage,
    response: Omit<DerivedStateMessage, "originator" | "id">,
    port: chrome.runtime.Port,
  ) {
    this.sendMessage(
      {
        ...response,
        id: originalMessage.id,
      },
      port,
    );
  }

  private sendMessage(message: Omit<DerivedStateMessage, "originator">, port: chrome.runtime.Port) {
    port.postMessage({
      ...message,
      originator: "background",
    });
  }
}
