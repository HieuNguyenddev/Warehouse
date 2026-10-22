import { useEffect, useMemo, useState } from "react";
import { getProvinces, getWards } from "../api/locations";

export function usePlaceNames(profiles, activeProvinceCodes = []) {
  const [provinces, setProvinces] = useState([]);
  const [wardsByProvince, setWardsByProvince] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProvinces()
      .then((data) => {
        if (!cancelled) {
          setProvinces(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Không tải được danh mục tỉnh, thành phố.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeKey = (Array.isArray(activeProvinceCodes) ? activeProvinceCodes : [activeProvinceCodes])
    .map((code) => String(code || ""))
    .filter(Boolean)
    .join("|");

  const needed = useMemo(() => {
    const codes = new Set(
      profiles.flatMap((profile) => [profile.provinceCode, profile.permanentProvinceCode])
        .map((code) => String(code || ""))
        .filter(Boolean),
    );
    activeKey.split("|").filter(Boolean).forEach((code) => codes.add(code));
    return [...codes];
  }, [profiles, activeKey]);

  useEffect(() => {
    const missing = needed.filter((code) => !wardsByProvince[code]);
    if (missing.length === 0) {
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      missing.map(async (code) => {
        const data = await getWards(code);
        return [code, Array.isArray(data) ? data : []];
      }),
    )
      .then((pairs) => {
        if (cancelled) {
          return;
        }
        setWardsByProvince((current) => {
          const next = { ...current };
          pairs.forEach(([code, list]) => {
            next[code] = list;
          });
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Không tải được danh mục xã, phường.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needed, wardsByProvince]);

  function nameOf(list, code) {
    if (!code) {
      return "";
    }
    return list.find((item) => item.code === String(code))?.name || "";
  }

  function placeOf(profile) {
    const provinceCode = String(profile?.provinceCode || "");
    const wardCode = String(profile?.wardCode || "");
    const permanentProvinceCode = String(profile?.permanentProvinceCode || "");
    const permanentWardCode = String(profile?.permanentWardCode || "");
    return {
      province: nameOf(provinces, provinceCode),
      ward: nameOf(wardsByProvince[provinceCode] || [], wardCode),
      permanentProvince: nameOf(provinces, permanentProvinceCode),
      permanentWard: nameOf(wardsByProvince[permanentProvinceCode] || [], permanentWardCode),
    };
  }

  function placeLabel(profile) {
    const place = placeOf(profile);
    const current = [place.ward, place.province].filter(Boolean).join(", ");
    const permanent = [place.permanentWard, place.permanentProvince].filter(Boolean).join(", ");
    return current || permanent;
  }

  const firstActive = activeKey.split("|").find(Boolean) || "";

  return {
    provinces,
    wards: wardsByProvince[firstActive] || [],
    error,
    loading,
    placeOf,
    placeLabel,
    wardLists: wardsByProvince,
  };
}
