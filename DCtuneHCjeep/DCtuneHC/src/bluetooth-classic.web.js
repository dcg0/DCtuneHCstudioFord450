// Web stub: Bluetooth clásico SPP no existe en el navegador.
// La app se mantiene en modo DEMO cuando corre en la vista web.
export default {
  getBondedDevices: async () => [],
  connectToDevice: async () => {
    throw new Error("Bluetooth clásico no disponible en la vista web");
  },
};
