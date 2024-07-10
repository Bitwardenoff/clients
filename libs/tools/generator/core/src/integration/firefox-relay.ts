import { IntegrationContext, IntegrationId } from "@bitwarden/common/tools/integration";
import { ApiSettings, IntegrationRequest } from "@bitwarden/common/tools/integration/rpc";

import { ForwarderConfiguration, ForwarderContext } from "../engine";
import { CreateForwardingEmailRpcDef } from "../engine/forwarder-configuration";
import { FIREFOX_RELAY_BUFFER, FIREFOX_RELAY_FORWARDER } from "../strategies/storage";
import { ApiOptions } from "../types";

// integration types
export type FirefoxRelaySettings = ApiSettings;
export type FirefoxRelayOptions = ApiOptions;
export type FirefoxRelayConfiguration = ForwarderConfiguration<
  FirefoxRelaySettings,
  FirefoxRelayOptions
>;

// default values
const defaultSettings = Object.freeze({
  token: "",
} as FirefoxRelaySettings);

// supported RPC calls
const createForwardingEmail = Object.freeze({
  url(_request: IntegrationRequest, context: ForwarderContext<FirefoxRelaySettings>) {
    return context.baseUrl() + "/v1/relayaddresses/";
  },
  body(request: IntegrationRequest, context: ForwarderContext<FirefoxRelaySettings>) {
    return {
      enabled: true,
      generated_for: context.website(request),
      description: context.generatedBy(request),
    };
  },
  hasJsonPayload(response: Response) {
    return response.status === 200 || response.status === 201;
  },
  processJson(json: any) {
    return [json.full_address];
  },
} as CreateForwardingEmailRpcDef<FirefoxRelaySettings>);

// forwarder configuration
const forwarder = Object.freeze({
  defaultSettings,
  settings: FIREFOX_RELAY_FORWARDER,
  importBuffer: FIREFOX_RELAY_BUFFER,
  createForwardingEmail,
} as const);

// integration-wide configuration
export const FirefoxRelay = Object.freeze({
  id: "firefoxrelay" as IntegrationId,
  name: "Firefox Relay",
  baseUrl: "https://relay.firefox.com/api",
  selfHost: "never",
  extends: ["forwarder"],
  authenticate(_request: IntegrationRequest, context: IntegrationContext<ApiSettings>) {
    return { Authorization: "Token " + context.authenticationToken() };
  },
  forwarder,
} as FirefoxRelayConfiguration);
