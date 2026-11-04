import math

from app.diagnostics.question_bank import BANK, BY_ID, get_question, questions_for

SUBTOPICS = {"vectors", "velocity", "acceleration", "motion_graphs", "projectile_motion"}


def test_bank_is_well_formed():
    assert len(BY_ID) == len(BANK)                       # нет повторяющихся id
    for q in BANK:
        assert q.subtopic_key in SUBTOPICS and q.qtype in {"choice", "numeric", "text"}
        assert q.difficulty in (1, 2, 3) and q.text and q.explanation
        if q.qtype == "choice":
            assert len(q.options) >= 2 and q.answer in range(len(q.options))
            assert all(i in range(len(q.options)) and i != q.answer for i in q.misconceptions)
        if q.qtype == "numeric":
            assert isinstance(q.answer, (int, float)) and q.tolerance > 0 and q.unit
            assert all(abs(v - q.answer) > q.tolerance for v, _ in q.wrong_numbers)  # «неверный» ответ реально неверен
        if q.qtype == "text":
            assert q.rubric


def test_every_subtopic_has_easy_and_harder_questions():
    for key in SUBTOPICS:
        levels = {q.difficulty for q in questions_for(key)}
        assert 1 in levels or 2 in levels, key
        assert len(questions_for(key)) >= 2, key
    assert math.isclose(get_question("vec_2").answer, 20 * math.cos(math.radians(30)), abs_tol=0.05)  # физика сходится
    assert math.isclose(get_question("proj_4").answer, 2 * 30 * math.sin(math.radians(30)) / 10, abs_tol=0.05)