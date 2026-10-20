import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const font = readFile(require.resolve('@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff'));

export async function renderSocialPreview({ title, subtitle = '' }) {
  // Reduce font size until the complete text fits; never shorten supplied text.
  for (let scale = 1; scale >= 0.2; scale -= 0.05) {
    let fits = true;
    const svg = await satori({
      type: 'div',
      props: {
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', width: 1200, height: 630,
          backgroundColor: '#f5f2ec', color: '#34312c', fontFamily: 'Blog Serif',
          textAlign: 'center',
        },
        children: [{
          type: 'div', props: {
            'data-text': true,
            style: { width: 1020, fontSize: 76 * scale, lineHeight: 1.15, letterSpacing: '-0.04em', flexShrink: 0 },
            children: title,
          },
        }, ...(subtitle ? [{
          type: 'div', props: {
            'data-text': true,
            style: { width: 1020, fontSize: 29 * scale, lineHeight: 1.46, color: '#665e54', marginTop: 30 * scale, flexShrink: 0 },
            children: subtitle,
          },
        }] : [])],
      },
    }, {
      width: 1200, height: 630,
      fonts: [{ name: 'Blog Serif', data: await font, weight: 400, style: 'normal' }],
      onNodeDetected: node => {
        if (node.props?.['data-text']) {
          fits &&= node.top >= 76 && node.top + node.height <= 554
            && node.left >= 89 && node.left + node.width <= 1111;
        }
      },
    });
    if (fits) return sharp(Buffer.from(svg)).png().toBuffer();
  }
  throw new Error(`Social preview text is too long to fit: ${title}`);
}
