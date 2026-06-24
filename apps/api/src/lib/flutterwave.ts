// @ts-ignore - flutterwave-node-v3 doesn't have type declarations
import Flutterwave from 'flutterwave-node-v3';

let flw: any = null;

const getFlutterwave = () => {
  if (!flw) {
    const publicKey = process.env.FLW_PUBLIC_KEY;
    const secretKey = process.env.FLW_SECRET_KEY;

    // Only initialize if keys are available
    if (publicKey && secretKey) {
      flw = new Flutterwave(publicKey, secretKey);
    }
  }
  return flw;
};

export default getFlutterwave;
