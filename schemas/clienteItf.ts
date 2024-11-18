import { Timestamp } from "firebase/firestore";

export interface clientesItf {
    id: string,
    nombre: string,
    direccion: string,
    debe: number,
    ultimoPago: Timestamp,
}