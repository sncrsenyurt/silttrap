// data-keep="yes" retains every scrap. "no" builds the same scraps and drops them.
const keep = document.body.dataset.keep === "yes";
const button = document.querySelector("button.again");
const kept = document.querySelector("#kept");
const pile = [];
const visitKey = keep ? "scrap-pile-visits" : "swept-pan-visits";

button.addEventListener("click", () => {
  const visits = Number(sessionStorage.getItem(visitKey) || "0") + 1;
  sessionStorage.setItem(visitKey, String(visits));
  const made = [];
  for (let batch = 0; batch < visits; batch += 1) {
    made.push(makeScrap(visits, batch));
  }
  if (keep) {
    pile.push(...made);
    kept.textContent = String(pile.length);
    return;
  }
  for (const scrap of made) {
    dropScrap(scrap);
  }
  kept.textContent = "0";
});

function makeScrap(visit, batch) {
  const el = document.createElement("div");
  const ears = [];
  for (let i = 0; i < 40; i += 1) {
    const node = document.createElement("span");
    node.textContent = `${visit}:${batch}:${i}`;
    const fn = () => node.textContent;
    node.addEventListener("click", fn);
    el.appendChild(node);
    ears.push({ node, fn });
  }
  return { el, ears };
}

function dropScrap(scrap) {
  for (const ear of scrap.ears) {
    ear.node.removeEventListener("click", ear.fn);
  }
}
