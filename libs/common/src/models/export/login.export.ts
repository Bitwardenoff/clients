import { EncString } from "../../platform/models/domain/enc-string";
import { Login as LoginDomain } from "../../vault/models/domain/login";
import { LoginView } from "../../vault/models/view/login.view";

import { Fido2KeyExport } from "./fido2key.export";
import { LoginUriExport } from "./login-uri.export";

export class LoginExport {
  static template(): LoginExport {
    const req = new LoginExport();
    req.uris = [];
    req.username = "jdoe";
    req.password = "myp@ssword123";
    req.totp = "JBSWY3DPEHPK3PXP";
    req.fido2Key = Fido2KeyExport.template();
    return req;
  }

  static toView(req: LoginExport, view = new LoginView()) {
    if (req.uris != null) {
      view.uris = req.uris.map((u) => LoginUriExport.toView(u));
    }
    view.username = req.username;
    view.password = req.password;
    view.totp = req.totp;
    if (req.fido2Key != null) {
      view.fido2Key = Fido2KeyExport.toView(req.fido2Key);
    }
    return view;
  }

  static toDomain(req: LoginExport, domain = new LoginDomain()) {
    if (req.uris != null) {
      domain.uris = req.uris.map((u) => LoginUriExport.toDomain(u));
    }
    domain.username = req.username != null ? new EncString(req.username) : null;
    domain.password = req.password != null ? new EncString(req.password) : null;
    domain.totp = req.totp != null ? new EncString(req.totp) : null;
    //left out fido2Key for now
    return domain;
  }

  uris: LoginUriExport[];
  username: string;
  password: string;
  totp: string;
  fido2Key: Fido2KeyExport = null;

  constructor(o?: LoginView | LoginDomain) {
    if (o == null) {
      return;
    }

    if (o.uris != null) {
      if (o instanceof LoginView) {
        this.uris = o.uris.map((u) => new LoginUriExport(u));
      } else {
        this.uris = o.uris.map((u) => new LoginUriExport(u));
      }
    }

    if (o.fido2Key != null) {
      this.fido2Key = new Fido2KeyExport(o.fido2Key);
    }

    if (o instanceof LoginView) {
      this.username = o.username;
      this.password = o.password;
      this.totp = o.totp;
    } else {
      this.username = o.username?.encryptedString;
      this.password = o.password?.encryptedString;
      this.totp = o.totp?.encryptedString;
    }
  }
}
