import {Widget, ClientBus, init, field} from "client-bus";


@Widget({ng2_providers: [ClientBus]})
export class UsersComponent {
  constructor(client_bus: ClientBus) {
    init(this, client_bus, [field("user", "User")]);
  }
}
