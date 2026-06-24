declare module 'flutterwave-node-v3' {
  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Transaction: {
      verify(options: { id: string | number }): Promise<{
        data: {
          id: number;
          tx_ref: string;
          status: string;
          amount: number;
          currency: string;
          customer: {
            email: string;
            name?: string;
          };
          meta?: Record<string, any>;
          [key: string]: any;
        };
        message: string;
        [key: string]: any;
      }>;
    };
    [key: string]: any;
  }

  export default Flutterwave;
}
