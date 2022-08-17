import { Injectable } from "@angular/core";
import { ipcRenderer } from "electron";

import { CipherService } from "@bitwarden/common/abstractions/cipher.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { CryptoFunctionService } from "@bitwarden/common/abstractions/cryptoFunction.service";
import { lockedUnlockedStatusString } from "@bitwarden/common/enums/authenticationStatus";
import { Utils } from "@bitwarden/common/misc/utils";
import { EncString } from "@bitwarden/common/models/domain/encString";
import { SymmetricCryptoKey } from "@bitwarden/common/models/domain/symmetricCryptoKey";
import { AuthService } from "@bitwarden/common/services/auth.service";
import { StateService } from "@bitwarden/common/services/state.service";

import {
  Message,
  UnencryptedMessage,
  UnencryptedMessageResponse,
  EncryptedMessage,
  EncryptedMessageResponse,
  DecryptedCommandData,
  CiphersResponse,
} from "../models/native-messages";

const EncryptionAlgorithm = "sha1";

@Injectable()
export class NativeMessageHandler {
  private ddgSharedSecret: SymmetricCryptoKey;

  constructor(
    private stateService: StateService,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private cryptoFunctionService: CryptoFunctionService,
    private cipherService: CipherService
  ) {}

  async handleMessage(message: Message) {
    const decryptedCommand = message as UnencryptedMessage;
    if (decryptedCommand.command === "bw-handshake") {
      await this.handleDecryptedMessage(decryptedCommand);
    } else {
      await this.handleEncryptedMessage(message as EncryptedMessage);
    }
  }

  private async handleDecryptedMessage(message: UnencryptedMessage) {
    const { messageId, payload } = message;
    const { publicKey } = payload;
    if (!publicKey) {
      this.sendResponse({
        messageId: messageId,
        version: 1,
        payload: {
          status: "cancelled",
        },
      });
      return;
    }

    const remotePublicKey = Utils.fromB64ToArray(publicKey).buffer;
    const ddgEnabled = await this.stateService.getEnableDuckDuckGoBrowserIntegration();

    if (!ddgEnabled) {
      this.sendResponse({
        messageId: messageId,
        version: 1,
        payload: {
          status: "cancelled",
        },
      });

      return;
    }

    const secret = await this.cryptoFunctionService.randomBytes(64);
    this.ddgSharedSecret = new SymmetricCryptoKey(secret);
    const encryptedSecret = await this.cryptoFunctionService.rsaEncrypt(
      secret,
      remotePublicKey,
      EncryptionAlgorithm
    );
    await this.stateService.setDuckDuckGoSharedKey(Utils.fromBufferToB64(encryptedSecret));

    this.sendResponse({
      messageId: messageId,
      version: 1,
      payload: {
        status: "success",
        sharedKey: Utils.fromBufferToB64(encryptedSecret),
      },
    });
  }

  private async handleEncryptedMessage(message: EncryptedMessage) {
    const decryptedCommandData = await this.decryptPayload(message);
    const { command } = decryptedCommandData;

    try {
      const responseData = await this.responseDataForCommand(decryptedCommandData);

      await this.sendEncryptedResponse(message, { command, payload: responseData });
    } catch (error) {
      this.sendEncryptedResponse(message, { command, payload: {} });
    }
  }

  private async responseDataForCommand(commandData: DecryptedCommandData): Promise<any> {
    const { command, payload } = commandData;

    switch (command) {
      case "bw-status": {
        const accounts = this.stateService.accounts.getValue();
        const activeUserId = await this.stateService.getUserId();

        if (!accounts || !Object.keys(accounts)) {
          return [];
        }

        return Promise.all(
          Object.keys(accounts).map(async (userId) => {
            const authStatus = await this.authService.getAuthStatus(userId);
            const email = await this.stateService.getEmail({ userId });

            return {
              id: userId,
              email,
              status: lockedUnlockedStatusString(authStatus),
              active: userId === activeUserId,
            };
          })
        );
      }
      case "bw-credential-retrieval": {
        if (payload.uri == null) {
          return;
        }

        const ciphersResponse: CiphersResponse[] = [];
        const activeUserId = await this.stateService.getUserId();
        const authStatus = await this.authService.getAuthStatus(activeUserId);

        if (lockedUnlockedStatusString(authStatus) !== "unlocked") {
          return { error: "locked" };
        }

        const ciphers = await this.cipherService.getAllDecryptedForUrl(payload.uri);
        ciphers.sort((a, b) => this.cipherService.sortCiphersByLastUsedThenName(a, b));

        ciphers.forEach((c) => {
          ciphersResponse.push({
            userId: activeUserId,
            credentialId: c.id,
            userName: c.login.username,
            password: c.login.password,
            name: c.name,
          } as CiphersResponse);
        });

        return ciphersResponse;
      }
      default:
        return {
          error: "cannot-decrypt",
        };
    }
  }

  private async encyptPayload(payload: any, key: SymmetricCryptoKey): Promise<EncString> {
    return await this.cryptoService.encrypt(JSON.stringify(payload), key);
  }

  private async decryptPayload(message: EncryptedMessage): Promise<DecryptedCommandData> {
    if (!this.ddgSharedSecret) {
      this.sendResponse({
        messageId: message.messageId,
        version: 1.0,
        payload: {
          error: "cannot-decrypt",
        },
      });
      return;
    }

    return JSON.parse(
      await this.cryptoService.decryptToUtf8(
        message.encryptedCommand as EncString,
        this.ddgSharedSecret
      )
    );
  }

  private async sendEncryptedResponse(
    originalMessage: EncryptedMessage,
    response: DecryptedCommandData
  ) {
    if (!this.ddgSharedSecret) {
      this.sendResponse({
        messageId: originalMessage.messageId,
        version: 1.0,
        payload: {
          error: "cannot-decrypt",
        },
      });

      return;
    }

    const encryptedPayload = await this.encyptPayload(response, this.ddgSharedSecret);

    this.sendResponse({
      messageId: originalMessage.messageId,
      version: 1.0,
      encryptedPayload,
    });
  }

  private sendResponse(response: EncryptedMessageResponse | UnencryptedMessageResponse) {
    ipcRenderer.send("nativeMessagingReply", response);
  }
}
