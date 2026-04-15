"""
Pydantic schemas for request / response validation.
"""

from datetime import date, datetime, time
from enum import Enum
from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────
class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class QuestionType(str, Enum):
    SLIDER = "SLIDER"
    CHOICE = "CHOICE"
    TEXT = "TEXT"
    BOOLEAN = "BOOLEAN"


# ── Auth ─────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    role: str
    username: str


# ── Users ────────────────────────────────────────────────────────────
class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole


class UserResponse(BaseModel):
    id: int
    role: str
    username: str
    email: str
    is_active: bool


# ── Patient details ─────────────────────────────────────────────────
class PatientDetailsRequest(BaseModel):
    user_id: int
    full_name: str
    birth_date: Optional[date] = None
    checkin_time: Optional[str] = None  # "HH:MM" string


# ── Patient dashboard ───────────────────────────────────────────────
class PatientDashboardResponse(BaseModel):
    full_name: str
    birth_date: Optional[date] = None
    streak_count: int
    next_checkin: Optional[str] = None


# ── Provider link ────────────────────────────────────────────────────
class CaregiverInfo(BaseModel):
    name: str
    phone: Optional[str] = None
    relation: Optional[str] = None


class DoctorInfo(BaseModel):
    name: str
    phone: Optional[str] = None


class ProviderLinkResponse(BaseModel):
    doctor: Optional[DoctorInfo] = None
    caregiver: Optional[CaregiverInfo] = None


class CreateProviderLinkRequest(BaseModel):
    patient_id: int
    doctor_id: int
    caregiver: CaregiverInfo


# ── Questions ────────────────────────────────────────────────────────
class SliderConfig(BaseModel):
    min_value: int
    max_value: int
    step: int


class ChoiceOption(BaseModel):
    id: int
    label: str
    value: int
    sort_order: int


class CharacteristicInfo(BaseModel):
    id: int
    name: str


class QuestionResponse(BaseModel):
    id: int
    characteristics: List[CharacteristicInfo]
    text: str
    type: str
    sort_order: int
    slider_config: Optional[SliderConfig] = None
    choice_options: Optional[List[ChoiceOption]] = None


# ── Check-in ─────────────────────────────────────────────────────────
class AnswerItem(BaseModel):
    question_id: int
    numeric_value: Optional[int] = None
    option_id: Optional[int] = None
    text_value: Optional[str] = None


class CheckinSubmitRequest(BaseModel):
    patient_user_id: int
    session_date: date
    answers: List[AnswerItem]


class CheckinSubmitResponse(BaseModel):
    session_id: int
    responses_saved: int


# ── Insights ─────────────────────────────────────────────────────────
class SessionSummaryAnswer(BaseModel):
    question: str
    answer: str

class SessionSummary(BaseModel):
    session_date: str
    answers: List[SessionSummaryAnswer]

class InsightsResponse(BaseModel):
    patient_name: str
    sessions: List[SessionSummary]
    insights: List[str]


class AgentPromptResponse(BaseModel):
    patient_name: str
    agent_prompt: str


# ── Sensors ──────────────────────────────────────────────────────────

class GpsSensorData(BaseModel):
    type: Literal["gps"]
    ts: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    source: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None


class WifiSensorData(BaseModel):
    type: Literal["wifi"]
    ts: Optional[datetime] = None
    bssid: Optional[str] = None
    frequency: Optional[int] = None
    signal_level: Optional[int] = Field(None, alias="signalLevel")
    scan_id: Optional[str] = None

    model_config = {"populate_by_name": True}


class WifiLocationSensorData(BaseModel):
    type: Literal["wifi_location"]
    ts: Optional[datetime] = None
    label: Optional[str] = None
    confidence: Optional[float] = None
    matched_bssids: Optional[str] = None


class PhoneChargeSensorData(BaseModel):
    type: Literal["phonecharge"]
    ts: Optional[datetime] = None
    battery_level: Optional[float] = Field(None, alias="batteryLevel")
    battery_state: Optional[str] = Field(None, alias="batteryState")
    power_mode: Optional[str] = Field(None, alias="powerMode")

    model_config = {"populate_by_name": True}


class PhoneChargePeriodSensorData(BaseModel):
    type: Literal["phonecharge_period"]
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    state: Optional[str] = None
    start_level: Optional[float] = None
    end_level: Optional[float] = None


class AppSessionSensorData(BaseModel):
    type: Literal["app_sessions"]
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    state: Optional[str] = None


SensorData = Union[
    GpsSensorData,
    WifiSensorData,
    WifiLocationSensorData,
    PhoneChargeSensorData,
    PhoneChargePeriodSensorData,
    AppSessionSensorData,
]


class SensorBatchRequest(BaseModel):
    userId: int
    deviceTime: Optional[datetime] = None
    sensors: List[SensorData] = Field(..., min_length=1)


class SensorBatchResponse(BaseModel):
    upload_id: int
    user_id: int
    inserted: Dict[str, int]
    total: int


class SensorTypeOut(BaseModel):
    id: int
    name: str


# ── GET /sensors/{user_id} response ─────────────────────────────────

class GpsSensorOut(BaseModel):
    id: int
    upload_id: int
    ts: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    source: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None


class WifiSensorOut(BaseModel):
    id: int
    upload_id: int
    ts: Optional[datetime] = None
    bssid: Optional[str] = None
    frequency: Optional[int] = None
    signal_level: Optional[int] = None
    scan_id: Optional[str] = None


class WifiLocationSensorOut(BaseModel):
    id: int
    upload_id: int
    ts: Optional[datetime] = None
    label: Optional[str] = None
    confidence: Optional[float] = None
    matched_bssids: Optional[str] = None


class PhoneChargeSensorOut(BaseModel):
    id: int
    upload_id: int
    ts: Optional[datetime] = None
    battery_level: Optional[float] = None
    battery_state: Optional[str] = None
    power_mode: Optional[str] = None


class PhoneChargePeriodSensorOut(BaseModel):
    id: int
    upload_id: int
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    state: Optional[str] = None
    start_level: Optional[float] = None
    end_level: Optional[float] = None


class AppSessionSensorOut(BaseModel):
    id: int
    upload_id: int
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    state: Optional[str] = None


class UserSensorsResponse(BaseModel):
    user_id: int
    gps: List[GpsSensorOut] = []
    wifi: List[WifiSensorOut] = []
    wifi_location: List[WifiLocationSensorOut] = []
    phonecharge: List[PhoneChargeSensorOut] = []
    phonecharge_period: List[PhoneChargePeriodSensorOut] = []
    app_sessions: List[AppSessionSensorOut] = []


# ── Voice conversation turns ─────────────────────────────────────────

class VoiceTurnRequest(BaseModel):
    user_id: int
    user_text: Optional[str] = None
    agent_text: Optional[str] = None
    user_start: Optional[datetime] = None
    user_end: Optional[datetime] = None
    agent_start: Optional[datetime] = None
    agent_end: Optional[datetime] = None


class VoiceTurnResponse(BaseModel):
    id: int
    user_id: int
    created_at: Optional[datetime] = None


class VoiceTurnOut(BaseModel):
    id: int
    user_id: int
    user_text: Optional[str] = None
    agent_text: Optional[str] = None
    user_start: Optional[datetime] = None
    user_end: Optional[datetime] = None
    agent_start: Optional[datetime] = None
    agent_end: Optional[datetime] = None
    user_duration_ms: Optional[int] = None
    agent_duration_ms: Optional[int] = None
    created_at: Optional[datetime] = None


class VoiceTurnsListResponse(BaseModel):
    user_id: int
    turns: List[VoiceTurnOut] = []
