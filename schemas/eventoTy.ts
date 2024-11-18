import { Timestamp } from "firebase/firestore";

type EventoBase = {
    id: string;
    borrado: boolean;
    editado: boolean;
    idCliente: string;
    notas?: string;
    creado: Timestamp;
    actualizado: Timestamp;
  };
  
  type EventoVenta = EventoBase & {
    tipo: "bajar";
    cantidad: number | null;
    precioUnitario: number | null;
    producto: string;
  };
  
  type EventoCobrar = EventoBase & {
    tipo: "entrego";
    monto: number | null;
  
  };
  
  export type EventoTy = EventoVenta | EventoCobrar;