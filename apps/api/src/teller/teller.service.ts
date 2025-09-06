import { Injectable, Inject } from '@nestjs/common';
import { TellerClient } from '@maxint/teller';

@Injectable()
export class TellerService {
  constructor(
    @Inject('TellerClient')
    private readonly tellerClient: TellerClient,
  ) {
    // The TellerClient is now available in this service via this.tellerClient.
    // Methods will be added here in future tasks to interact with the Teller API.
    console.log('TellerService initialized.');
  }

  // Future methods for interacting with Teller API will go here.
  // For example:
  //
  // async getAccounts(accessToken: string) {
  //   // The client from @maxint/teller might need to be instantiated
  //   // with an access token for each user request. This service
  //   // will be the place to manage that logic.
  //   return this.tellerClient.accounts.list({ accessToken });
  // }
}
