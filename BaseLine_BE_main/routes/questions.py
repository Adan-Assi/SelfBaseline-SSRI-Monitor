"""
Question routes — GET /questions
"""

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import CharacteristicInfo, ChoiceOption, QuestionResponse, SliderConfig

router = APIRouter(tags=["questions"])


@router.get("/questions", response_model=list[QuestionResponse])
def get_questions():
    """
    Return all questions with nested slider_config or choice_options,
    grouped by characteristic via junction table.
    """
    try:
        # 1. Question-characteristic links with nested question + characteristic data
        qc_result = (
            dependencies.supabase.table("question_characteristics")
            .select(
                "question_id, characteristic_id, sort_order, "
                "characteristics(name), questions(id, text, type)"
            )
            .order("sort_order")
            .execute()
        )

        # 2. Slider configs (keyed by question_id)
        slider_result = dependencies.supabase.table("slider_config").select("*").execute()
        sliders = {s["question_id"]: s for s in slider_result.data}

        # 3. Choice options (grouped by question_id)
        choice_result = (
            dependencies.supabase.table("choice_options")
            .select("id, question_id, label, value, sort_order")
            .order("sort_order")
            .execute()
        )
        choices: dict[int, list] = {}
        for c in choice_result.data:
            choices.setdefault(c["question_id"], []).append(c)

        # 4. Group by question, collecting characteristics
        question_map: dict[int, dict] = {}
        for qc in qc_result.data:
            q = qc["questions"]
            qid = q["id"]

            # Build characteristic info
            char_info = None
            char_data = qc.get("characteristics")
            if isinstance(char_data, dict) and char_data.get("name"):
                char_info = CharacteristicInfo(
                    id=qc["characteristic_id"],
                    name=char_data["name"],
                )

            if qid not in question_map:
                slider_cfg = None
                if qid in sliders:
                    s = sliders[qid]
                    slider_cfg = SliderConfig(
                        min_value=s["min_value"],
                        max_value=s["max_value"],
                        step=s["step"],
                    )

                choice_opts = None
                if qid in choices:
                    choice_opts = [
                        ChoiceOption(
                            id=c["id"],
                            label=c["label"],
                            value=c["value"],
                            sort_order=c["sort_order"],
                        )
                        for c in choices[qid]
                    ]

                question_map[qid] = {
                    "id": qid,
                    "text": q["text"],
                    "type": q["type"],
                    "characteristics": [],
                    "slider_config": slider_cfg,
                    "choice_options": choice_opts,
                }

            if char_info:
                question_map[qid]["characteristics"].append(char_info)

        # 5. Build response with sequential sort_order
        questions: list[QuestionResponse] = []
        for idx, entry in enumerate(question_map.values(), start=1):
            questions.append(
                QuestionResponse(
                    id=entry["id"],
                    characteristics=entry["characteristics"],
                    text=entry["text"],
                    type=entry["type"],
                    sort_order=idx,
                    slider_config=entry["slider_config"],
                    choice_options=entry["choice_options"],
                )
            )

        return questions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
