interface AssessmentQuestionImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function AssessmentQuestionImage({
  src,
  alt,
  className,
}: AssessmentQuestionImageProps) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-[22rem] w-full object-contain"
        />
      </div>
    </div>
  );
}
