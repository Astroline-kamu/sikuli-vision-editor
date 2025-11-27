import React, { useRef } from 'react'

type Props = {
  onAddImage: (img: { id: string; name: string; dataUrl: string }) => void
  images: { id: string; name: string; dataUrl: string }[]
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

export default function ImageLibrary({ onAddImage, images }: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      onAddImage({ id: uid(), name: f.name, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(f)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ width: 240, borderLeft: '1px solid #1f2937', background: '#0f172a', color: '#e5e7eb', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 600 }}>图片库</div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {images.map(i => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={i.dataUrl} style={{ width: 48, height: 48, objectFit: 'contain', background: '#1f2937', borderRadius: 6 }} />
            <div style={{ fontSize: 12 }}>{i.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}