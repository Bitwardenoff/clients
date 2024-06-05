import { awaitAsync } from "@bitwarden/common/../spec";
import { identity } from "rxjs";

import { DeriveDefinition } from "@bitwarden/common/platform/state";
// eslint-disable-next-line import/no-restricted-paths -- needed to define a derive definition
import { StateDefinition } from "@bitwarden/common/platform/state/state-definition";

import { mockPorts } from "../../../spec/mock-port.spec-util";

import { ForegroundDerivedState } from "./foreground-derived-state";

const stateDefinition = new StateDefinition("test", "memory");
const deriveDefinition = new DeriveDefinition(stateDefinition, "test", {
  derive: (dateString: string) => (dateString == null ? null : new Date(dateString)),
  deserializer: (dateString: string) => (dateString == null ? null : new Date(dateString)),
  cleanupDelayMs: 1,
});

describe("ForegroundDerivedState", () => {
  let sut: ForegroundDerivedState<Date>;
  const portName = "testPort";

  beforeEach(() => {
    mockPorts();
    sut = new ForegroundDerivedState<Date>(deriveDefinition, portName, identity);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should not connect a port until subscribed", async () => {
    expect(sut["port"]).toBeUndefined();
    const subscription = sut.state$.subscribe();

    expect(sut["port"]).toBeDefined();
    subscription.unsubscribe();
  });

  it("should disconnect its port when unsubscribed", async () => {
    const subscription = sut.state$.subscribe();

    expect(sut["port"]).toBeDefined();
    const disconnectSpy = jest.spyOn(sut["port"], "disconnect");
    subscription.unsubscribe();
    // wait for the cleanup delay
    await awaitAsync(deriveDefinition.cleanupDelayMs * 2);

    expect(disconnectSpy).toHaveBeenCalled();
    expect(sut["port"]).toBeNull();
  });
});
