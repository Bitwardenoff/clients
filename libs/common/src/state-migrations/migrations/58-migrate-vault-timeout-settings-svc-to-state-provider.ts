import { KeyDefinitionLike, MigrationHelper, StateDefinitionLike } from "../migration-helper";
import { Migrator } from "../migrator";

// Types to represent data as it is stored in JSON
type ExpectedAccountType = {
  settings?: {
    vaultTimeout?: number;
    vaultTimeoutAction?: string;
  };
};

type ExpectedGlobalType = {
  vaultTimeout?: number;
  vaultTimeoutAction?: string;
};

const VAULT_TIMEOUT_SETTINGS_STATE_DEF_LIKE: StateDefinitionLike = {
  name: "vaultTimeoutSettings",
};

export const VAULT_TIMEOUT: KeyDefinitionLike = {
  key: "vaultTimeout", // matches KeyDefinition.key
  stateDefinition: VAULT_TIMEOUT_SETTINGS_STATE_DEF_LIKE,
};

export const VAULT_TIMEOUT_ACTION: KeyDefinitionLike = {
  key: "vaultTimeoutAction", // matches KeyDefinition.key
  stateDefinition: VAULT_TIMEOUT_SETTINGS_STATE_DEF_LIKE,
};

export class VaultTimeoutSettingsServiceStateProviderMigrator extends Migrator<57, 58> {
  async migrate(helper: MigrationHelper): Promise<void> {
    const globalData = await helper.get<ExpectedGlobalType>("global");

    const accounts = await helper.getAccounts<ExpectedAccountType>();
    async function migrateAccount(
      userId: string,
      account: ExpectedAccountType | undefined,
    ): Promise<void> {
      let updatedAccount = false;

      // Migrate vault timeout
      const existingVaultTimeout = account?.settings?.vaultTimeout;

      if (existingVaultTimeout !== undefined) {
        // check undefined so that we persist null values
        // Only migrate data that exists
        await helper.setToUser(userId, VAULT_TIMEOUT, existingVaultTimeout);

        delete account?.settings?.vaultTimeout;
        updatedAccount = true;
      }

      // Migrate vault timeout action
      const existingVaultTimeoutAction = account?.settings?.vaultTimeoutAction;

      if (existingVaultTimeoutAction != null) {
        // Only migrate data that exists
        await helper.setToUser(userId, VAULT_TIMEOUT_ACTION, existingVaultTimeoutAction);

        delete account?.settings?.vaultTimeoutAction;
        updatedAccount = true;
      }

      // Note: we are explicitly not worrying about mapping over the global fallback vault timeout / action
      // into the new state provider framework.  It was originally a fallback but hasn't been used for years
      // so this migration will clean up the global properties fully.

      if (updatedAccount) {
        // Save the migrated account only if it was updated
        await helper.set(userId, account);
      }
    }

    await Promise.all([...accounts.map(({ userId, account }) => migrateAccount(userId, account))]);

    // Delete global data
    delete globalData?.vaultTimeout;
    delete globalData?.vaultTimeoutAction;
    await helper.set("global", globalData);
  }

  async rollback(helper: MigrationHelper): Promise<void> {
    const accounts = await helper.getAccounts<ExpectedAccountType>();

    async function rollbackAccount(userId: string, account: ExpectedAccountType): Promise<void> {
      let updatedLegacyAccount = false;

      // Rollback vault timeout
      const migratedVaultTimeout = await helper.getFromUser<number>(userId, VAULT_TIMEOUT);

      if (account?.settings && migratedVaultTimeout != null) {
        account.settings.vaultTimeout = migratedVaultTimeout;
        updatedLegacyAccount = true;
      }

      await helper.setToUser(userId, VAULT_TIMEOUT, null);

      // Rollback vault timeout action
      const migratedVaultTimeoutAction = await helper.getFromUser<string>(
        userId,
        VAULT_TIMEOUT_ACTION,
      );

      if (account?.settings && migratedVaultTimeoutAction != null) {
        account.settings.vaultTimeoutAction = migratedVaultTimeoutAction;
        updatedLegacyAccount = true;
      }

      await helper.setToUser(userId, VAULT_TIMEOUT_ACTION, null);

      if (updatedLegacyAccount) {
        await helper.set(userId, account);
      }
    }

    await Promise.all([...accounts.map(({ userId, account }) => rollbackAccount(userId, account))]);
  }
}
