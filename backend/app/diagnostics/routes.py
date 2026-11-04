"""API диагностики: начать тест -> отвечать на вопросы -> завершить."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.academics.subjects import owned_topic
from app.database.connection import get_db
from app.database.models import DiagnosticTest, Student, StudentAnswer, TestQuestion, Topic
from app.deps import current_student
from app.diagnostics.checker import check_answer
from app.diagnostics.evaluator import FinishedError, NoAnswersError, finish_test
from app.diagnostics.question_bank import get_question
from app.diagnostics.test_generator import NoQuestionsError, add_next_question, create_test
from app.diagnostics.text_evaluator import evaluate_text

router = APIRouter(prefix="/api/tests", tags=["diagnostics"])


class TestStart(BaseModel):
    topic_id: int
    kind: Literal["diagnostic", "post_lesson"] = "diagnostic"


class AnswerIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    question_id: int
    answer: str = Field(min_length=1, max_length=2000)


def _owned_test(db: Session, student: Student, test_id: int) -> DiagnosticTest:
    t = db.get(DiagnosticTest, test_id)
    if not t or t.student_id != student.id:
        raise HTTPException(404, "Тест не найден")
    return t


def _public(tq: TestQuestion) -> dict:
    """Ученик получает ТОЛЬКО условие: без верного ответа, типов ошибок и пояснений."""
    return {"id": tq.id, "number": tq.order + 1, "qtype": tq.qtype, "difficulty": tq.difficulty, **tq.payload}


def _state(db: Session, test: DiagnosticTest) -> dict:
    qs = db.query(TestQuestion).filter_by(test_id=test.id).order_by(TestQuestion.order).all()
    done = {a.question_id for a in db.query(StudentAnswer).filter(StudentAnswer.question_id.in_([q.id for q in qs]))}
    open_q = next((q for q in qs if q.id not in done), None)
    state = {"test_id": test.id, "kind": test.kind, "status": test.status, "total": test.result["length"],
             "answered": len(done), "question": _public(open_q) if open_q and test.status == "in_progress" else None}
    if test.status == "finished":
        state["result"] = test.result
    return state


@router.post("", status_code=201)
def start_test(data: TestStart, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    topic = owned_topic(db, student, data.topic_id)
    try:
        test = create_test(db, student, topic, data.kind)
    except NoQuestionsError:
        raise HTTPException(422, "Для этой темы пока нет диагностических вопросов")
    db.commit()
    return _state(db, test)


@router.get("/{test_id}")
def get_test(test_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    return _state(db, _owned_test(db, student, test_id))


@router.post("/{test_id}/answers")
def submit_answer(test_id: int, data: AnswerIn, student: Student = Depends(current_student),
                  db: Session = Depends(get_db)):
    test = _owned_test(db, student, test_id)
    if test.status != "in_progress":
        raise HTTPException(409, "Тест уже завершён")
    tq = db.get(TestQuestion, data.question_id)
    if not tq or tq.test_id != test.id:
        raise HTTPException(404, "Вопрос не найден")
    if db.query(StudentAnswer).filter_by(question_id=tq.id).first():
        raise HTTPException(409, "На этот вопрос уже отвечено")
    q = get_question(tq.bank_id)
    if q.qtype == "text":
        ev = evaluate_text(q, data.answer)
        row = StudentAnswer(question_id=tq.id, answer=data.answer, is_correct=ev["score"] >= 0.99,
                            score=ev["score"], evaluation=ev)
    else:
        try:
            res = check_answer(q, data.answer)
        except ValueError as e:
            raise HTTPException(422, str(e))
        row = StudentAnswer(question_id=tq.id, answer=data.answer, is_correct=res.is_correct,
                            score=res.score, misconception=res.misconception)
    db.add(row)
    db.flush()
    add_next_question(db, student, test, db.get(Topic, test.topic_id))
    db.commit()
    return _state(db, test)


@router.post("/{test_id}/finish")
def finish(test_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    test = _owned_test(db, student, test_id)
    try:
        finish_test(db, student, test)
    except FinishedError:
        raise HTTPException(409, "Тест уже завершён")
    except NoAnswersError:
        raise HTTPException(422, "В тесте нет ни одного ответа")
    return _state(db, test)