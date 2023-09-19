import { EVENTS } from "../../constants";
import { setElementStyles } from "../../utils/utils";
import {
  BackgroundPortMessageHandlers,
  AutofillOverlayIframeService as AutofillOverlayIframeServiceInterface,
  AutofillOverlayIframeExtensionMessage,
} from "../abstractions/autofill-overlay-iframe.service";

class AutofillOverlayIframeService implements AutofillOverlayIframeServiceInterface {
  private port: chrome.runtime.Port | null = null;
  private extensionOriginsSet: Set<string>;
  private iframeMutationObserver: MutationObserver;
  private readonly iframe: HTMLIFrameElement;
  private ariaAlertElement: HTMLDivElement;
  private ariaAlertTimeout: NodeJS.Timeout;
  private iframeStyles: Partial<CSSStyleDeclaration> = {
    all: "initial",
    position: "fixed",
    display: "block",
    zIndex: "2147483647",
    lineHeight: "0",
    overflow: "hidden",
    transition: "opacity 125ms ease-out 0s",
    visibility: "visible",
    clipPath: "none",
    pointerEvents: "auto",
    margin: "0",
    padding: "0",
    colorScheme: "normal",
    opacity: "0",
  };
  private readonly backgroundPortMessageHandlers: BackgroundPortMessageHandlers = {
    updateIframePosition: ({ message }) => this.updateIframePosition(message.position),
    updateOverlayHidden: ({ message }) => this.updateElementStyles(this.iframe, message.display),
  };

  constructor(private iframePath: string, private portName: string, private shadow: ShadowRoot) {
    this.iframe = globalThis.document.createElement("iframe");
    this.extensionOriginsSet = new Set([
      chrome.runtime.getURL("").slice(0, -1).toLowerCase(), // Remove the trailing slash and normalize the extension url to lowercase
      "null",
    ]);

    this.iframeMutationObserver = new MutationObserver(this.handleMutationObserver);
  }

  initOverlayIframe(
    initStyles: Partial<CSSStyleDeclaration>,
    iframeTitle: string,
    ariaAlert?: string
  ) {
    this.iframe.src = chrome.runtime.getURL(this.iframePath);
    this.updateElementStyles(this.iframe, { ...this.iframeStyles, ...initStyles });
    this.iframe.tabIndex = -1;
    this.iframe.setAttribute("title", iframeTitle);
    this.iframe.setAttribute("sandbox", "allow-scripts");
    this.iframe.setAttribute("allowtransparency", "true");
    this.iframe.addEventListener(EVENTS.LOAD, this.setupPortMessageListener);

    if (ariaAlert) {
      this.createAriaAlertElement(ariaAlert);
    }

    this.shadow.appendChild(this.iframe);
  }

  private createAriaAlertElement(ariaAlertText: string) {
    this.ariaAlertElement = globalThis.document.createElement("div");
    this.ariaAlertElement.setAttribute("role", "status");
    this.ariaAlertElement.setAttribute("aria-live", "polite");
    this.ariaAlertElement.setAttribute("aria-atomic", "true");
    this.updateElementStyles(this.ariaAlertElement, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      opacity: "0",
      pointerEvents: "none",
    });
    this.ariaAlertElement.textContent = ariaAlertText;
  }

  private setupPortMessageListener = () => {
    this.port = chrome.runtime.connect({ name: this.portName });
    this.port.onDisconnect.addListener(this.handlePortDisconnect);
    this.port.onMessage.addListener(this.handlePortMessage);
    globalThis.addEventListener(EVENTS.MESSAGE, this.handleWindowMessage);

    this.announceAriaAlert();
  };

  private announceAriaAlert() {
    if (!this.ariaAlertElement) {
      return;
    }

    this.ariaAlertElement.remove();
    if (this.ariaAlertTimeout) {
      clearTimeout(this.ariaAlertTimeout);
    }

    this.ariaAlertTimeout = setTimeout(() => this.shadow.appendChild(this.ariaAlertElement), 2000);
  }

  private handlePortDisconnect = (port: chrome.runtime.Port) => {
    if (port.name !== this.portName) {
      return;
    }

    this.updateElementStyles(this.iframe, { opacity: "0", height: "0px", display: "block" });
    globalThis.removeEventListener("message", this.handleWindowMessage);
    this.port.onMessage.removeListener(this.handlePortMessage);
    this.port.onDisconnect.removeListener(this.handlePortDisconnect);
    this.port.disconnect();
    this.port = null;
  };

  private handlePortMessage = (
    message: AutofillOverlayIframeExtensionMessage,
    port: chrome.runtime.Port
  ) => {
    if (port.name !== this.portName || !this.iframe.contentWindow) {
      return;
    }

    if (this.backgroundPortMessageHandlers[message.command]) {
      this.backgroundPortMessageHandlers[message.command]({ message, port });
      return;
    }

    this.iframe.contentWindow.postMessage(message, "*");
  };

  private updateIframePosition(position: Partial<CSSStyleDeclaration>) {
    this.updateElementStyles(this.iframe, position);
    setTimeout(() => this.updateElementStyles(this.iframe, { opacity: "1" }), 0);
    this.announceAriaAlert();
  }

  private handleWindowMessage = (event: MessageEvent) => {
    if (
      !this.port ||
      event.source !== this.iframe.contentWindow ||
      !this.isFromExtensionOrigin(event.origin.toLowerCase())
    ) {
      return;
    }

    const message = event.data;
    if (message.command === "updateAutofillOverlayListHeight") {
      this.updateElementStyles(this.iframe, { height: `${message.height}px` });
      return;
    }

    this.port.postMessage(event.data);
  };

  private updateElementStyles(customElement: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
    if (!customElement) {
      return;
    }

    this.unobserveIframe();

    setElementStyles(customElement, styles, true);
    this.iframeStyles = { ...this.iframeStyles, ...styles };

    this.observeIframe();
  }

  /**
   * Chrome returns null for any sandboxed iframe sources.
   * Firefox references the extension URI as its origin.
   * Any other origin value is a security risk.
   * @param {string} messageOrigin
   * @returns {boolean}
   * @private
   */
  private isFromExtensionOrigin(messageOrigin: string): boolean {
    return this.extensionOriginsSet.has(messageOrigin);
  }

  private handleMutationObserver = (mutations: MutationRecord[]) => {
    for (let index = 0; index < mutations.length; index++) {
      const mutation = mutations[index];
      if (mutation.type !== "attributes" || mutation.attributeName !== "style") {
        continue;
      }

      this.iframe.removeAttribute("style");
      this.updateElementStyles(this.iframe, this.iframeStyles);
    }
  };

  private observeIframe() {
    this.iframeMutationObserver.observe(this.iframe, { attributes: true });
  }

  private unobserveIframe() {
    this.iframeMutationObserver.disconnect();
  }
}

export default AutofillOverlayIframeService;
