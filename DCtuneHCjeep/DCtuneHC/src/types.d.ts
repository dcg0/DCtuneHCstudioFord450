declare module "react-native-bluetooth-classic" {
  type BluetoothDevice = {
    address: string;
    name?: string;
    connect: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    write: (data: string) => Promise<void>;
    onDataReceived: (listener: (event: { data: string }) => void) => { remove: () => void };
  };

  const BluetoothClassic: {
    getBondedDevices: () => Promise<BluetoothDevice[]>;
    connectToDevice: (address: string) => Promise<BluetoothDevice>;
  };

  export default BluetoothClassic;
}