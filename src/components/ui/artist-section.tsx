import { ArrowUpRight } from "lucide-react";
import artistNote from "@/assets/artist-note.jpg";
import "./artist-section.css";

type ArtistSectionProps = {
  imageUrl?: string;
  imageAlt?: string;
  photographerImageUrl?: string;
  photographerImageAlt?: string;
  inquiryHref?: string;
};

export default function ArtistSection({
  imageUrl = artistNote,
  imageAlt = "A bride in a quiet moment before the ceremony",
  photographerImageUrl,
  photographerImageAlt = "The SR Studio photographer",
  inquiryHref = "#inquire",
}: ArtistSectionProps) {
  return (
    <section className="artist-section section-mask" id="about">
      <div className="artist-section__layout">
        <div className="artist-section__image-wrap">
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
          {photographerImageUrl && (
            <img
              className="artist-section__photographer"
              src={photographerImageUrl}
              alt={photographerImageAlt}
              loading="lazy"
            />
          )}
          <span className="artist-section__caption">A QUIET MOMENT, BEFORE IT ALL BEGINS</span>
        </div>
      <div className="artist-section__copy">
        <p className="artist-section__eyebrow">A NOTE FROM THE ARTIST</p>
        <h2>More than how it looked.<br /><em>How it felt.</em></h2>
        <p className="artist-section__lead">We believe the best wedding photographs don't ask you to perform. They let you be fully, wonderfully, yourself.</p>
        <p className="artist-section__body">SR Studio was built around that simple idea. We show up with an open heart, a calm presence, and the craft to notice what matters: your dad's proud smile, the deep breath before the aisle, the dance floor long after the shoes come off.</p>
        <p className="artist-section__body">With thoughtful planning and professional equipment that stays quietly in the background, we're here to make space for your day to unfold and tell its story with care.</p>
        <a className="artist-section__link" href={inquiryHref}>A little more about us <ArrowUpRight size={16} /></a>
        <div className="artist-section__signature">With love, <span>Sarah R.</span></div>
        </div>
      </div>
    </section>
  );
}
