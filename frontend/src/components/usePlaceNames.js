import { useEffect, useMemo, useState } from "react";
import { getProvinces, getWards } from "../api/locations";

export function usePlaceNames(profiles, activeProvinceCode) {
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

  const needed = useMemo(() => {
    const codes = new Set(
      profiles.map((profile) => String(profile.provinceCode || "")).filter(Boolean),
    );
    if (activeProvinceCode) {
      codes.add(String(activeProvinceCode));
    }
    return [...codes];
  }, [profiles, activeProvinceCode]);

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
    return {
      province: nameOf(provinces, provinceCode),
      ward: nameOf(wardsByProvince[provinceCode] || [], wardCode),
    };
  }

  function placeLabel(profile) {
    const place = placeOf(profile);
    return [place.ward, place.province].filter(Boolean).join(", ");
  }

  return {
    provinces,
    wards: wardsByProvince[String(activeProvinceCode || "")] || [],
    error,
    loading,
    placeOf,
    placeLabel,
    wardLists: wardsByProvince,
  };
}
