import DronePage from "./DroneModel.jsx";
import "./DroneShowcase.css";

/** The controller feed and the interactive aircraft share the same showcase. */
export function DroneShowcase() {
  return (
    <section className="drone-showcase section-mask" aria-labelledby="aerial-showcase-title">
      <div className="drone-showcase__inner">
        <div className="drone-showcase__intro">
          <p className="eyebrow">Aerial perspective</p>
          <h2 id="aerial-showcase-title">
            See every celebration from a <em>new angle</em>
          </h2>
          <p>
            A live studio view of the camera system we use to frame the scale,
            energy, and detail of a wedding day.
          </p>
        </div>

        <div className="drone-showcase__visuals">
          <div className="drone-controller">
            <img
              src="/controller.png"
              alt="Drone remote controller"
              draggable="false"
            />
            <div className="drone-controller__screen" aria-hidden="true">
              <video
                src="/drone_optimized.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
              />
            </div>
          </div>
          <div className="drone-aircraft">
            <DronePage />
          </div>
        </div>
      </div>
    </section>
  );
}
