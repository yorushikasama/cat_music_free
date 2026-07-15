import { useEffect, useRef } from "react";

export default function (msg?: string, deps: any[] = []) {
    const idRef = useRef<number | undefined>(undefined);
    const msgRef = useRef(msg);
    msgRef.current = msg;
    useEffect(() => {
        idRef.current = Math.random();
        console.log("Mount", msgRef.current ?? "", idRef.current);
        return () => {
            console.log("Unmount", msgRef.current ?? "", idRef.current);
        };
    }, []);

    if (deps.length !== 0) {
        console.log("State Change", msg ?? "", idRef.current);
    }

    useEffect(() => {
        idRef.current && console.log("Rerender: ", msg ?? "", idRef.current);
    });
}
