import { useEffect } from "react";
import interact from "interactjs";

export default function App() {
  useEffect(() => {
    const grid = document.querySelector<HTMLDivElement>("div#grid");
    let x = 0;
    let y = 0;

    if (grid) {
      interact(".draggable")
        .resizable({
          // resize from all edges and corners
          edges: { left: false, right: true, bottom: true },

          listeners: {
            move(event) {
              const target = event.target;

              // update the element's style
              target.style.width = event.rect.width + "px";
              target.style.height = event.rect.height + "px";

              target.setAttribute("data-x", x);
              target.setAttribute("data-y", y);
            },
          },
          modifiers: [
            // keep the edges inside the parent
            interact.modifiers.restrictEdges({
              outer: "parent",
            }),

            // minimum size
            interact.modifiers.restrictSize({
              min: { width: 100, height: 50 },
            }),
          ],

          inertia: true,
        })
        .draggable({
          modifiers: [
            interact.modifiers.snap({
              targets: [interact.snappers.grid({ x: 32, y: 32 })],
              range: Infinity,
              relativePoints: [{ x: 0, y: 0 }],
            }),
            interact.modifiers.restrict({
              restriction: grid,
              elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
              endOnly: true,
            }),
          ],
          inertia: true,
        })
        .on("dragmove", function (event) {
          x += event.dx;
          y += event.dy;

          event.target.style.transform = "translate(" + x + "px, " + y + "px)";
        });
    }
  }, []);

  return (
    <div
      id="grid"
      style={{
        height: "100%",
      }}
    >
      <div
        className="draggable"
        style={{
          width: "20rem",
          overflow: "hidden",
          userSelect: "none",
          padding: "1rem",
          border: "1px solid var(--foreground)",
          backgroundColor: "var(--background)",
        }}
      >
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem vero
          ipsum tenetur numquam possimus cumque perspiciatis est, neque ut quia,
          incidunt inventore, magni nobis accusamus rerum? Earum asperiores
          officia eum?
        </p>
      </div>
    </div>
  );
}
