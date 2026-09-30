import { addDoc, collection, deleteDoc, doc, 
  getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "canvases";

export interface CanvasDoc {
  title: string;
  data: string | null;
}

export async function createCanvas(): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    title: "Untitled canvas",
    data: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function loadCanvas(id: string): Promise<CanvasDoc | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { title: d.title ?? "Untitled canvas", data: d.data ?? null };
}

export async function saveCanvas(id: string, data: string, title: string) {
  await updateDoc(doc(db, COLLECTION, id), { data, title, updatedAt: serverTimestamp() });
}

export async function deleteCanvas(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}