// @ts-ignore - flutterwave-node-v3 doesn't have type declarations
import Flutterwave from 'flutterwave-node-v3';

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY!,
  process.env.FLW_SECRET_KEY!
);

export default flw;
