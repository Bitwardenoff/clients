import { CardApi } from "../../../models/api/card.api";
import { FieldApi } from "../../../models/api/field.api";
import { IdentityApi } from "../../../models/api/identity.api";
import { LoginUriApi } from "../../../models/api/login-uri.api";
import { LoginApi } from "../../../models/api/login.api";
import { SecureNoteApi } from "../../../models/api/secure-note.api";
import { Fido2KeyApi } from "../../api/fido2-key.api";
import { CipherRepromptType } from "../../enums/cipher-reprompt-type";
import { CipherType } from "../../enums/cipher-type";
import { Cipher } from "../domain/cipher";

import { AttachmentRequest } from "./attachment.request";
import { PasswordHistoryRequest } from "./password-history.request";

export class CipherRequest {
  type: CipherType;
  folderId: string;
  organizationId: string;
  name: string;
  notes: string;
  favorite: boolean;
  login: LoginApi;
  secureNote: SecureNoteApi;
  card: CardApi;
  identity: IdentityApi;
  fido2Key: Fido2KeyApi;
  fields: FieldApi[];
  passwordHistory: PasswordHistoryRequest[];
  // Deprecated, remove at some point and rename attachments2 to attachments
  attachments: { [id: string]: string };
  attachments2: { [id: string]: AttachmentRequest };
  lastKnownRevisionDate: Date;
  reprompt: CipherRepromptType;

  constructor(cipher: Cipher) {
    this.type = cipher.type;
    this.folderId = cipher.folderId;
    this.organizationId = cipher.organizationId;
    this.name = cipher.name ? cipher.name.encryptedString : null;
    this.notes = cipher.notes ? cipher.notes.encryptedString : null;
    this.favorite = cipher.favorite;
    this.lastKnownRevisionDate = cipher.revisionDate;
    this.reprompt = cipher.reprompt;

    switch (this.type) {
      case CipherType.Login:
        this.login = new LoginApi();
        this.login.uris = null;
        this.login.username = cipher.login.username ? cipher.login.username.encryptedString : null;
        this.login.password = cipher.login.password ? cipher.login.password.encryptedString : null;
        this.login.passwordRevisionDate =
          cipher.login.passwordRevisionDate != null
            ? cipher.login.passwordRevisionDate.toISOString()
            : null;
        this.login.totp = cipher.login.totp ? cipher.login.totp.encryptedString : null;
        this.login.autofillOnPageLoad = cipher.login.autofillOnPageLoad;

        if (cipher.login.uris != null) {
          this.login.uris = cipher.login.uris.map((u) => {
            const uri = new LoginUriApi();
            uri.uri = u.uri != null ? u.uri.encryptedString : null;
            uri.match = u.match != null ? u.match : null;
            return uri;
          });
        }

        if (cipher.login.fido2Key != null) {
          this.login.fido2Key = new Fido2KeyApi();
          this.login.fido2Key.nonDiscoverableId =
            cipher.login.fido2Key.nonDiscoverableId != null
              ? cipher.login.fido2Key.nonDiscoverableId.encryptedString
              : null;
          this.login.fido2Key.keyType =
            cipher.login.fido2Key.keyType != null
              ? (cipher.login.fido2Key.keyType.encryptedString as "public-key")
              : null;
          this.login.fido2Key.keyAlgorithm =
            cipher.login.fido2Key.keyAlgorithm != null
              ? (cipher.login.fido2Key.keyAlgorithm.encryptedString as "ECDSA")
              : null;
          this.login.fido2Key.keyCurve =
            cipher.login.fido2Key.keyCurve != null
              ? (cipher.login.fido2Key.keyCurve.encryptedString as "P-256")
              : null;
          this.login.fido2Key.keyValue =
            cipher.login.fido2Key.keyValue != null
              ? cipher.login.fido2Key.keyValue.encryptedString
              : null;
          this.login.fido2Key.rpId =
            cipher.login.fido2Key.rpId != null ? cipher.login.fido2Key.rpId.encryptedString : null;
          this.login.fido2Key.rpName =
            cipher.login.fido2Key.rpName != null
              ? cipher.login.fido2Key.rpName.encryptedString
              : null;
          this.login.fido2Key.counter =
            cipher.login.fido2Key.counter != null
              ? cipher.login.fido2Key.counter.encryptedString
              : null;
          this.login.fido2Key.userHandle =
            cipher.login.fido2Key.userHandle != null
              ? cipher.login.fido2Key.userHandle.encryptedString
              : null;
          this.login.fido2Key.userName =
            cipher.login.fido2Key.userName != null
              ? cipher.login.fido2Key.userName.encryptedString
              : null;
        }
        break;
      case CipherType.SecureNote:
        this.secureNote = new SecureNoteApi();
        this.secureNote.type = cipher.secureNote.type;
        break;
      case CipherType.Card:
        this.card = new CardApi();
        this.card.cardholderName =
          cipher.card.cardholderName != null ? cipher.card.cardholderName.encryptedString : null;
        this.card.brand = cipher.card.brand != null ? cipher.card.brand.encryptedString : null;
        this.card.number = cipher.card.number != null ? cipher.card.number.encryptedString : null;
        this.card.expMonth =
          cipher.card.expMonth != null ? cipher.card.expMonth.encryptedString : null;
        this.card.expYear =
          cipher.card.expYear != null ? cipher.card.expYear.encryptedString : null;
        this.card.code = cipher.card.code != null ? cipher.card.code.encryptedString : null;
        break;
      case CipherType.Identity:
        this.identity = new IdentityApi();
        this.identity.title =
          cipher.identity.title != null ? cipher.identity.title.encryptedString : null;
        this.identity.firstName =
          cipher.identity.firstName != null ? cipher.identity.firstName.encryptedString : null;
        this.identity.middleName =
          cipher.identity.middleName != null ? cipher.identity.middleName.encryptedString : null;
        this.identity.lastName =
          cipher.identity.lastName != null ? cipher.identity.lastName.encryptedString : null;
        this.identity.address1 =
          cipher.identity.address1 != null ? cipher.identity.address1.encryptedString : null;
        this.identity.address2 =
          cipher.identity.address2 != null ? cipher.identity.address2.encryptedString : null;
        this.identity.address3 =
          cipher.identity.address3 != null ? cipher.identity.address3.encryptedString : null;
        this.identity.city =
          cipher.identity.city != null ? cipher.identity.city.encryptedString : null;
        this.identity.state =
          cipher.identity.state != null ? cipher.identity.state.encryptedString : null;
        this.identity.postalCode =
          cipher.identity.postalCode != null ? cipher.identity.postalCode.encryptedString : null;
        this.identity.country =
          cipher.identity.country != null ? cipher.identity.country.encryptedString : null;
        this.identity.company =
          cipher.identity.company != null ? cipher.identity.company.encryptedString : null;
        this.identity.email =
          cipher.identity.email != null ? cipher.identity.email.encryptedString : null;
        this.identity.phone =
          cipher.identity.phone != null ? cipher.identity.phone.encryptedString : null;
        this.identity.ssn =
          cipher.identity.ssn != null ? cipher.identity.ssn.encryptedString : null;
        this.identity.username =
          cipher.identity.username != null ? cipher.identity.username.encryptedString : null;
        this.identity.passportNumber =
          cipher.identity.passportNumber != null
            ? cipher.identity.passportNumber.encryptedString
            : null;
        this.identity.licenseNumber =
          cipher.identity.licenseNumber != null
            ? cipher.identity.licenseNumber.encryptedString
            : null;
        break;
      case CipherType.Fido2Key:
        this.fido2Key = new Fido2KeyApi();
        this.fido2Key.nonDiscoverableId =
          cipher.fido2Key.nonDiscoverableId != null
            ? cipher.fido2Key.nonDiscoverableId.encryptedString
            : null;
        this.fido2Key.keyType =
          cipher.fido2Key.keyType != null
            ? (cipher.fido2Key.keyType.encryptedString as "public-key")
            : null;
        this.fido2Key.keyAlgorithm =
          cipher.fido2Key.keyAlgorithm != null
            ? (cipher.fido2Key.keyAlgorithm.encryptedString as "ECDSA")
            : null;
        this.fido2Key.keyCurve =
          cipher.fido2Key.keyCurve != null
            ? (cipher.fido2Key.keyCurve.encryptedString as "P-256")
            : null;
        this.fido2Key.keyValue =
          cipher.fido2Key.keyValue != null ? cipher.fido2Key.keyValue.encryptedString : null;
        this.fido2Key.rpId =
          cipher.fido2Key.rpId != null ? cipher.fido2Key.rpId.encryptedString : null;
        this.fido2Key.rpName =
          cipher.fido2Key.rpName != null ? cipher.fido2Key.rpName.encryptedString : null;
        this.fido2Key.counter =
          cipher.fido2Key.counter != null ? cipher.fido2Key.counter.encryptedString : null;
        this.fido2Key.userHandle =
          cipher.fido2Key.userHandle != null ? cipher.fido2Key.userHandle.encryptedString : null;
        this.fido2Key.userName =
          cipher.fido2Key.userName != null ? cipher.fido2Key.userName.encryptedString : null;
        break;
      default:
        break;
    }

    if (cipher.fields != null) {
      this.fields = cipher.fields.map((f) => {
        const field = new FieldApi();
        field.type = f.type;
        field.name = f.name ? f.name.encryptedString : null;
        field.value = f.value ? f.value.encryptedString : null;
        field.linkedId = f.linkedId;
        return field;
      });
    }

    if (cipher.passwordHistory != null) {
      this.passwordHistory = [];
      cipher.passwordHistory.forEach((ph) => {
        this.passwordHistory.push({
          lastUsedDate: ph.lastUsedDate,
          password: ph.password ? ph.password.encryptedString : null,
        });
      });
    }

    if (cipher.attachments != null) {
      this.attachments = {};
      this.attachments2 = {};
      cipher.attachments.forEach((attachment) => {
        const fileName = attachment.fileName ? attachment.fileName.encryptedString : null;
        this.attachments[attachment.id] = fileName;
        const attachmentRequest = new AttachmentRequest();
        attachmentRequest.fileName = fileName;
        if (attachment.key != null) {
          attachmentRequest.key = attachment.key.encryptedString;
        }
        this.attachments2[attachment.id] = attachmentRequest;
      });
    }
  }
}
