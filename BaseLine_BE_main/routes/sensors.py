"""
Sensor routes — POST /sensors/batch, GET /sensors/types
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import (
    SensorBatchRequest,
    SensorBatchResponse,
    SensorTypeOut,
    UserSensorsResponse,
    GpsSensorData,
    WifiSensorData,
    WifiLocationSensorData,
    PhoneChargeSensorData,
    PhoneChargePeriodSensorData,
    AppSessionSensorData,
)

router = APIRouter(prefix="/sensors", tags=["sensors"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ts_or_now(ts) -> str:
    """Return an ISO string; fall back to UTC now if ts is None."""
    if ts is None:
        return _now_iso()
    if isinstance(ts, datetime):
        return ts.isoformat()
    return str(ts)


# ── INSERT helpers (one per sensor table) ────────────────────────────

def _insert_gps(upload_id: int, items: list[GpsSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "ts": _ts_or_now(item.ts),
            "latitude": item.latitude,
            "longitude": item.longitude,
            "accuracy": item.accuracy,
            "altitude": item.altitude,
            "speed": item.speed,
            "heading": item.heading,
            "source": item.source,
            "window_start": item.window_start,
            "window_end": item.window_end,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_gps").insert(rows).execute()


def _insert_wifi(upload_id: int, items: list[WifiSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "ts": _ts_or_now(item.ts),
            "bssid": item.bssid,
            "frequency": item.frequency,
            "signal_level": item.signal_level,
            "scan_id": item.scan_id,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_wifi").insert(rows).execute()


def _insert_wifi_location(upload_id: int, items: list[WifiLocationSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "ts": _ts_or_now(item.ts),
            "label": item.label,
            "confidence": item.confidence,
            "matched_bssids": item.matched_bssids,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_wifi_location").insert(rows).execute()


def _insert_phonecharge(upload_id: int, items: list[PhoneChargeSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "ts": _ts_or_now(item.ts),
            "battery_level": item.battery_level,
            "battery_state": item.battery_state,
            "power_mode": item.power_mode,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_phonecharge").insert(rows).execute()


def _insert_phonecharge_period(upload_id: int, items: list[PhoneChargePeriodSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "start_ts": _ts_or_now(item.start_ts),
            "end_ts": _ts_or_now(item.end_ts),
            "state": item.state,
            "start_level": item.start_level,
            "end_level": item.end_level,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_phonecharge_period").insert(rows).execute()


def _insert_app_session(upload_id: int, items: list[AppSessionSensorData]):
    rows = [
        {
            "upload_id": upload_id,
            "start_ts": _ts_or_now(item.start_ts),
            "end_ts": _ts_or_now(item.end_ts),
            "state": item.state,
        }
        for item in items
    ]
    dependencies.supabase.table("sensor_app_sessions").insert(rows).execute()


# Map sensor type → insert function
_INSERTERS = {
    "gps": _insert_gps,
    "wifi": _insert_wifi,
    "wifi_location": _insert_wifi_location,
    "phonecharge": _insert_phonecharge,
    "phonecharge_period": _insert_phonecharge_period,
    "app_sessions": _insert_app_session,
}


def _load_sensor_type_map() -> dict[str, int]:
    """Load sensor_types table and return {name: id} mapping."""
    result = dependencies.supabase.table("sensor_types").select("id, name").execute()
    return {row["name"]: row["id"] for row in result.data}


# ── GET /sensors/types ───────────────────────────────────────────────

@router.get("/types", response_model=List[SensorTypeOut])
def get_sensor_types():
    """Return all rows from the sensor_types lookup table."""
    try:
        result = dependencies.supabase.table("sensor_types").select("id, name").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sensor types: {e}")


# ── GET /sensors/{user_id} ───────────────────────────────────────────

@router.get("/{user_id}", response_model=UserSensorsResponse)
def get_user_sensors(user_id: int):
    """
    Return all sensor data for a given user, grouped by sensor type.
    """
    try:
        # 1. Get all upload IDs for this user
        uploads_result = (
            dependencies.supabase.table("sensor_uploads")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        upload_ids = [row["id"] for row in uploads_result.data]

        if not upload_ids:
            return UserSensorsResponse(user_id=user_id)

        # 2. Query each sensor table filtered by upload_ids
        gps = dependencies.supabase.table("sensor_gps").select("*").in_("upload_id", upload_ids).order("ts", desc=True).execute()
        wifi = dependencies.supabase.table("sensor_wifi").select("*").in_("upload_id", upload_ids).order("ts", desc=True).execute()
        wifi_loc = dependencies.supabase.table("sensor_wifi_location").select("*").in_("upload_id", upload_ids).order("ts", desc=True).execute()
        charge = dependencies.supabase.table("sensor_phonecharge").select("*").in_("upload_id", upload_ids).order("ts", desc=True).execute()
        charge_period = dependencies.supabase.table("sensor_phonecharge_period").select("*").in_("upload_id", upload_ids).order("start_ts", desc=True).execute()
        app_sess = dependencies.supabase.table("sensor_app_sessions").select("*").in_("upload_id", upload_ids).order("start_ts", desc=True).execute()

        return UserSensorsResponse(
            user_id=user_id,
            gps=gps.data,
            wifi=wifi.data,
            wifi_location=wifi_loc.data,
            phonecharge=charge.data,
            phonecharge_period=charge_period.data,
            app_sessions=app_sess.data,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sensor data: {e}")


# ── POST /sensors/batch ─────────────────────────────────────────────

@router.post("/batch", response_model=SensorBatchResponse)
def upload_sensor_batch(body: SensorBatchRequest):
    """
    Upload one or more sensor readings in a single call.

    The `type` field is a string (e.g. "gps", "wifi").
    The server validates it against the sensor_types table and resolves
    the name → id internally.

    Call GET /sensors/types to see valid type names.
    """

    # 0. Load sensor_types lookup: {name → id}
    try:
        type_map = _load_sensor_type_map()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sensor types: {e}")

    # Validate all type names in the payload exist in the DB
    for sensor in body.sensors:
        if sensor.type not in type_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown sensor type: '{sensor.type}'. "
                       f"Valid types: {list(type_map.keys())}",
            )

    # 1. Create an upload record
    try:
        upload_result = (
            dependencies.supabase.table("sensor_uploads")
            .insert({
                "user_id": body.userId,
                "uploaded_at": _now_iso(),
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create upload record: {e}")

    upload_id: int = upload_result.data[0]["id"]

    # 2. Bucket sensors by type
    buckets: dict[str, list] = defaultdict(list)
    for sensor in body.sensors:
        buckets[sensor.type].append(sensor)

    # 3. Insert each bucket into the corresponding table
    try:
        for sensor_type, items in buckets.items():
            inserter = _INSERTERS.get(sensor_type)
            if inserter is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown sensor type: {sensor_type}",
                )
            inserter(upload_id, items)
    except HTTPException:
        raise
    except Exception as e:
        # Best-effort cleanup: remove the upload record
        dependencies.supabase.table("sensor_uploads").delete().eq("id", upload_id).execute()
        raise HTTPException(status_code=400, detail=f"Failed to save sensor data: {e}")

    # 4. Return summary
    inserted = {k: len(v) for k, v in buckets.items()}
    return SensorBatchResponse(
        upload_id=upload_id,
        user_id=body.userId,
        inserted=inserted,
        total=len(body.sensors),
    )
