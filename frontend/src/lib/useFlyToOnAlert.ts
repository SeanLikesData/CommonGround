import { useEffect, useRef } from "react";
import { getMapInstance } from "./mapInstance";
import { useMapStore } from "./store";

export function useFlyToOnAlert() {
  const alerts = useMapStore((s) => s.alerts);
  const lastCount = useRef(0);

  useEffect(() => {
    if (alerts.length > lastCount.current) {
      const newest = alerts[alerts.length - 1];
      const map = getMapInstance();
      if (map) {
        map.flyTo({ center: newest.location, zoom: 14, speed: 0.7, curve: 1.4 });
      }
    }
    lastCount.current = alerts.length;
  }, [alerts]);
}
