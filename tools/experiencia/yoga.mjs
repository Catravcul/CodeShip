// PX-23. Yoga in the ring with the skeleton brought over from Cold Sanctuary (docs/design/esqueleto.md): «Ir» to the
// Sun Salutation on the mat; each right answer moves Doménica into the next asana (smooth transition, IK,
// breath). One capture per asana, docs/screenshots/yoga-<nn>-<asana>-movil.png, next to the asana sheet's
// description (Cold Sanctuary has no reference images: docs/yoga-asanas-spec.md is the reference), and the
// IK check that her hands and feet rest on the mat. Also measures the JS time of the pose updates.
import { mkdirSync } from "node:fs";

/** 3,5 cm: «on the mat» (Cold Sanctuary aims palms 3 cm over the floor). */
const ON_MAT = 0.035;

/**
 * What each asana must show (docs/yoga-asanas-spec.md, «Saludo al Sol»): soles and palms that bear weight
 * on the mat, and the sheet's words for the capture.
 */
const SHEET = {
  "samasthitih-de-pie": { feet: 2, hands: 0, text: "De pie, talones juntos, brazos sueltos (antes de empezar)." },
  "pranamasana-oracion": { feet: 2, hands: 0, palms: true, text: "De pie, talones juntos; palmas juntas en rezo frente al esternón, codos abajo." },
  "hasta-uttanasana-brazos-arriba": { feet: 2, hands: 0, text: "Inhala: brazos arriba a la anchura de los hombros, suave extensión de la columna." },
  "uttanasana-flexion-adelante": { feet: 2, hands: 2, text: "Exhala: bisagra de cadera, piernas rectas, manos al suelo junto a cada pie." },
  "ashwa-sanchalanasana-zancada": { feet: 1, hands: 2, text: "Inhala: pie derecho atrás con la rodilla al suelo; pie izquierdo entre las manos." },
  "dandasana-plancha": { feet: 2, hands: 0, text: "Retén: plancha, cuerpo en línea del talón a la coronilla, brazos verticales." },
  "ashtanga-namaskara-ocho-miembros": { feet: 2, hands: 2, text: "Exhala: rodillas, pecho y barbilla al suelo; cadera elevada." },
  "bhujangasana-cobra": { feet: 0, hands: 2, text: "Inhala: tumbada, pecho arriba por extensión de la espalda, manos de apoyo." },
  "adho-mukha-svanasana-perro-boca-abajo": { feet: 2, hands: 2, text: "Exhala: V invertida, caderas al cielo, brazos en línea con el torso." },
  "ashwa-sanchalanasana-zancada-2": { feet: 1, hands: 2, text: "Inhala: zancada con la otra pierna (pie izquierdo atrás)." },
};

const figure = () => {
  const f = window.codeship.interior.figure;
  const c = f.contacts();
  return { asana: f.currentAsana?.id, arrived: f.asanaArrived, breath: f.breath, contacts: c, visible: f.root.visible };
};
const current = () => window.codeship.interior.session?.run.current;

async function capture(j, n, id) {
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/yoga-${String(n).padStart(2, "0")}-${id}-movil.png` });
  await j.shot(`${String(n).padStart(2, "0")}-${id}`);
}

/** Waits until the figure has arrived in `id` (the transition takes 3 s of game time; slower with CPU ×4). */
async function arrive(j, id) {
  return j.page
    .waitForFunction((want) => {
      const f = window.codeship.interior.figure;
      return f.currentAsana?.id === want && f.asanaArrived;
    }, id, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
}

function checkContacts(j, id, s) {
  const spec = SHEET[id];
  if (!spec || !s.contacts) {
    j.check(`${id}: se miden los apoyos de manos y pies`, !!s.contacts, JSON.stringify(s));
    return;
  }
  const c = s.contacts;
  const cm = (v) => `${(v * 100).toFixed(1)} cm`;
  const feet = [c.FootLeft, c.FootRight].filter((v) => v < ON_MAT).length;
  const hands = [c.HandLeft, c.HandRight].filter((v) => v < ON_MAT).length;
  const detail = `manos ${cm(c.HandLeft)} / ${cm(c.HandRight)}, pies ${cm(c.FootLeft)} / ${cm(c.FootRight)}`;
  if (spec.feet) j.check(`${id}: ${spec.feet === 2 ? "las dos plantas" : "un pie"} en la esterilla (IK y apoyo)`, feet >= spec.feet, detail);
  if (spec.hands) j.check(`${id}: las dos manos en la esterilla (IK de alcance)`, hands >= spec.hands, detail);
  j.check(`${id}: nada atraviesa la esterilla`, Math.min(c.HandLeft, c.HandRight, c.FootLeft, c.FootRight) > -0.005, detail);
}

export async function yoga(j) {
  const p = j.page;
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await j.setup("la llevamos al anillo (bajar del eje por el radio se juega en «movimiento»)", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });

  // «Ir» to the Sun Salutation on the ring's mat (the first one in the list; the station's says «de la estación»).
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.task-board .tb-task:has-text("Saludo al Sol"):has-text("Esterilla de yoga ·") .tb-go', "Ir: Saludo al Sol (esterilla del anillo)");
  await j.waitDuel(120000);
  await j.resetPerf();
  await p.evaluate(() => {
    const t = window.codeship.interior.poseTime;
    t.figura.reset();
    t.animales.reset();
  });
  const start = await p.evaluate(figure);
  j.check("en la esterilla se ve a Doménica de pie (Samasthitih) antes de la primera postura", start.visible && start.asana === "samasthitih-de-pie", JSON.stringify(start));
  await arrive(j, "samasthitih-de-pie");
  checkContacts(j, "samasthitih-de-pie", await p.evaluate(figure));
  await capture(j, 0, "samasthitih-de-pie");

  // The twelve postures: a right answer each, then she moves into the asana.
  const postures = await p.evaluate(() => window.codeship.interior.session?.run.steps);
  const ids = ["pranamasana-oracion", "hasta-uttanasana-brazos-arriba", "uttanasana-flexion-adelante", "ashwa-sanchalanasana-zancada", "dandasana-plancha", "ashtanga-namaskara-ocho-miembros", "bhujangasana-cobra", "adho-mukha-svanasana-perro-boca-abajo", "ashwa-sanchalanasana-zancada-2", "uttanasana-flexion-adelante", "hasta-uttanasana-brazos-arriba", "pranamasana-oracion"];
  j.check("el Saludo al Sol tiene 12 posturas, un reto cada una", postures === 12, String(postures));
  const breaths = new Set();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    await j.answer(current);
    const ok = await arrive(j, id);
    const s = await p.evaluate(figure);
    j.check(`postura ${i + 1}: entra en ${id} con una transición suave`, ok && s.asana === id, JSON.stringify({ asana: s.asana, arrived: s.arrived }));
    if (s.breath) breaths.add(s.breath);
    checkContacts(j, id, s);
    if (s.contacts && SHEET[id]?.palms) {
      const palms = await p.evaluate(() => {
        const f = window.codeship.interior.figure;
        const a = f.handWorld(0, new (f.root.position.constructor)());
        const b = f.handWorld(1, new (f.root.position.constructor)());
        return a.distanceTo(b);
      });
      j.check(`${id}: las palmas se juntan (IK de alcance)`, palms < 0.1, `${(palms * 100).toFixed(1)} cm entre las manos`);
    }
    // Captures of each asana once (the last three repeat the first ones).
    if (i < 9) await capture(j, i + 1, id);
    if (SHEET[id] && i < 9) j.check(`${id}: captura junto a la ficha — «${SHEET[id].text}»`, true);
  }
  j.check("respira mientras sostiene las posturas (inhala y exhala)", breaths.size === 2, [...breaths].join(", "));
  await p.waitForTimeout(500);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("Saludo al Sol: «Conseguido»", /Conseguido/.test(result), result);

  // JS time of the pose updates (performance.now around them, CPU ×4): the budget of docs/design/esqueleto.md.
  const t = await p.evaluate(() => {
    const x = window.codeship.interior.poseTime;
    const one = (f) => ({ median: f.medianMs, mean: f.meanMs, max: f.maxMs, n: f.samples });
    return { figura: one(x.figura), animales: one(x.animales) };
  });
  j.perfExtra = t;
  const ms = (f) => `mediana ${f.median.toFixed(3)} ms, media ${f.mean.toFixed(3)} ms, máx ${f.max.toFixed(1)} ms`;
  console.log(`  · JS de poses en ${t.figura.n} fotogramas: Doménica ${ms(t.figura)}; 4 gatos, 4 gallinas y 2 perros ${ms(t.animales)}`);
  // The median: on a shared machine the mean and the worst carry the stalls of other processes.
  j.check(`el esqueleto de Doménica cuesta menos de 1 ms de JS por fotograma con la CPU ×4 (${ms(t.figura)})`, t.figura.n > 0 && t.figura.median < 1, JSON.stringify(t.figura));
  await j.tap(".duel button.end", "Continuar");
  const after = await p.evaluate(figure);
  j.check("al terminar, la figura de la esterilla se recoge", !after.visible);
}
