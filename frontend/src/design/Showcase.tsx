import { useState } from "react";
import {
  Badge, Button, Card, EmptyState, LEVEL_LABELS, MasteryBadge, MasteryLevel, Modal, ProgressBar, ProgressRing,
  Skeleton, Tabs, ThemeToggle, useToast, masteryLevel,
} from "./index";

const SAMPLES: { name: string; mastery: number | null; tasks: number }[] = [
  { name: "Не оценено", mastery: null, tasks: 0 },
  { name: "Ускорение", mastery: 0.4, tasks: 10 },
  { name: "Графики движения", mastery: 0.65, tasks: 8 },
  { name: "Скорость", mastery: 0.85, tasks: 10 },
  { name: "Векторы (мало данных)", mastery: 0.95, tasks: 3 },
];

export default function Showcase() {
  const [tab, setTab] = useState("a");
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="cg-container" style={{ padding: "32px 0 80px" }}>
      <div className="cg-row" style={{ justifyContent: "space-between" }}>
        <div><h1>Cogniva — дизайн-система</h1><p className="cg-muted">Страница для проверки компонентов. Переключите тему справа.</p></div>
        <ThemeToggle />
      </div>

      <div className="cg-grid" style={{ marginTop: 24 }}>
        <Card title="Кнопки">
          <div className="cg-row">
            <Button>Основная</Button><Button variant="secondary">Вторичная</Button>
            <Button variant="ghost">Тихая</Button><Button variant="danger">Удалить</Button>
            <Button loading>Загрузка</Button><Button disabled>Отключена</Button>
            <Button size="sm">Малая</Button><Button size="lg">Большая</Button>
          </div>
        </Card>

        <Card title="Бейджи">
          <div className="cg-row">
            <Badge>Нейтральный</Badge><Badge tone="accent">Акцент</Badge><Badge tone="success" dot>Успех</Badge>
            <Badge tone="warning" dot>Демо-режим ИИ</Badge><Badge tone="danger">Ошибка</Badge><Badge tone="info">Инфо</Badge>
          </div>
        </Card>

        <Card title="Уровни освоения" action={<Badge tone="info">по правилам mastery.ts</Badge>}>
          <div style={{ display: "grid", gap: 10 }}>
            {SAMPLES.map(s => (
              <div key={s.name} className="cg-row" style={{ justifyContent: "space-between" }}>
                <span>{s.name}</span><MasteryBadge mastery={s.mastery} tasksDone={s.tasks} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Прогресс">
          <div style={{ display: "grid", gap: 14 }}>
            {SAMPLES.map(s => {
              const level: MasteryLevel = masteryLevel(s.mastery, s.tasks);
              return <ProgressBar key={s.name} value={s.mastery} level={level} label={`${s.name} — ${LEVEL_LABELS[level]}`} />;
            })}
          </div>
          <div className="cg-row" style={{ marginTop: 18 }}>
            <ProgressRing value={0.4} level="developing" />
            <ProgressRing value={0.85} level="mastered" size={72} />
            <ProgressRing value={null} size={72} />
          </div>
        </Card>

        <Card title="Вкладки">
          <Tabs tabs={[{ id: "a", label: "Объяснение" }, { id: "b", label: "Практика" }, { id: "c", label: "Итоги" }]} active={tab} onChange={setTab} />
          <p className="cg-muted" style={{ marginTop: 14 }}>Активная вкладка: <b>{tab}</b> (работает и стрелками ← →)</p>
        </Card>

        <Card title="Окно и уведомления">
          <div className="cg-row">
            <Button variant="secondary" onClick={() => setOpen(true)}>Открыть окно</Button>
            <Button variant="secondary" onClick={() => toast.show("Оценка сохранена", "success")}>Успех</Button>
            <Button variant="secondary" onClick={() => toast.show("Сервер ИИ в демо-режиме", "warning")}>Предупреждение</Button>
            <Button variant="secondary" onClick={() => toast.show("Не удалось сохранить", "danger")}>Ошибка</Button>
          </div>
        </Card>

        <Card title="Загрузка">
          <div style={{ display: "grid", gap: 10 }}><Skeleton height={22} width="60%" /><Skeleton height={14} /><Skeleton height={14} width="85%" /></div>
        </Card>

        <Card title="Пустое состояние">
          <EmptyState icon="🧪" title="Пока нет вопросов" description="Для этой темы диагностика появится позже."
                      action={<Button variant="secondary" size="sm">Выбрать другую тему</Button>} />
        </Card>

        <Card title="Карточка-кнопка" onClick={() => toast.show("Карточка нажата")}>
          <p className="cg-muted" style={{ margin: 0 }}>Наведите курсор или нажмите Tab и Enter.</p>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Подтверждение"
             footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button><Button onClick={() => setOpen(false)}>Готово</Button></>}>
        <p className="cg-muted">Закрыть можно кнопкой, клавишей Esc или щелчком по тёмному фону.</p>
      </Modal>
    </div>
  );
}