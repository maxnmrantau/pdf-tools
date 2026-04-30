import { PDFDocument, degrees } from 'pdf-lib'
import { readFileAsArrayBuffer } from './fileUtils'

export async function loadPdfDocument(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file)
  return PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
}

export async function getPdfPageCount(file) {
  const pdfDoc = await loadPdfDocument(file)
  return pdfDoc.getPageCount()
}

export async function mergePdfs(files) {
  const mergedPdf = await PDFDocument.create()
  for (const file of files) {
    const pdfDoc = await loadPdfDocument(file)
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
    copiedPages.forEach(page => mergedPdf.addPage(page))
  }
  return mergedPdf.save()
}

export async function splitPdf(file, pageIndices) {
  const srcDoc = await loadPdfDocument(file)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}

export async function rotatePdf(file, rotations) {
  const pdfDoc = await loadPdfDocument(file)
  const pages = pdfDoc.getPages()
  rotations.forEach(({ pageIndex, angle }) => {
    if (pageIndex < pages.length) {
      const page = pages[pageIndex]
      const currentRotation = page.getRotation().angle
      page.setRotation(degrees(currentRotation + angle))
    }
  })
  return pdfDoc.save()
}

export async function addWatermark(file, watermarks = [], pageIndices = null) {
  const pdfDoc = await loadPdfDocument(file)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont('Helvetica')

  // If pageIndices provided, only apply to those pages; otherwise all pages
  const targetPages = pageIndices
    ? pageIndices.map(i => ({ page: pages[i], index: i })).filter(p => p.page)
    : pages.map((page, index) => ({ page, index }))

  for (const { page } of targetPages) {
    const { width, height } = page.getSize()

    for (const wm of watermarks) {
      if (wm.type === 'text') {
        const { text, fontSize = 40, opacity = 0.3, color = [0.5, 0.5, 0.5], rotation = -45, position = 'center' } = wm
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const textHeight = fontSize

        let x, y
        switch (position) {
          case 'top-left':
            x = 30; y = height - 60; break
          case 'top-center':
            x = (width - textWidth) / 2; y = height - 60; break
          case 'top-right':
            x = width - textWidth - 30; y = height - 60; break
          case 'middle-left':
            x = 30; y = height / 2; break
          case 'center':
            x = (width - textWidth) / 2; y = height / 2; break
          case 'middle-right':
            x = width - textWidth - 30; y = height / 2; break
          case 'bottom-left':
            x = 30; y = 60; break
          case 'bottom-center':
            x = (width - textWidth) / 2; y = 60; break
          case 'bottom-right':
            x = width - textWidth - 30; y = 60; break
          case 'custom':
            x = wm.x || (width - textWidth) / 2
            y = wm.y || height / 2
            break
          default:
            x = (width - textWidth) / 2; y = height / 2
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          opacity,
          color: { type: 'RGB', red: color[0], green: color[1], blue: color[2] },
          rotate: degrees(rotation),
        })
      } else if (wm.type === 'image') {
        const { imageBytes, imageType, opacity = 0.3, scale: imgScale = 0.25, position = 'center' } = wm

        let image
        if (imageType === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes)
        } else {
          image = await pdfDoc.embedJpg(imageBytes)
        }

        const imgWidth = image.width * imgScale
        const imgHeight = image.height * imgScale

        let x, y
        switch (position) {
          case 'top-left':
            x = 20; y = height - imgHeight - 20; break
          case 'top-center':
            x = (width - imgWidth) / 2; y = height - imgHeight - 20; break
          case 'top-right':
            x = width - imgWidth - 20; y = height - imgHeight - 20; break
          case 'middle-left':
            x = 20; y = (height - imgHeight) / 2; break
          case 'center':
            x = (width - imgWidth) / 2; y = (height - imgHeight) / 2; break
          case 'middle-right':
            x = width - imgWidth - 20; y = (height - imgHeight) / 2; break
          case 'bottom-left':
            x = 20; y = 20; break
          case 'bottom-center':
            x = (width - imgWidth) / 2; y = 20; break
          case 'bottom-right':
            x = width - imgWidth - 20; y = 20; break
          case 'custom':
            x = wm.x || (width - imgWidth) / 2
            y = wm.y || (height - imgHeight) / 2
            break
          default:
            x = (width - imgWidth) / 2; y = (height - imgHeight) / 2
        }

        page.drawImage(image, {
          x,
          y,
          width: imgWidth,
          height: imgHeight,
          opacity,
        })
      }
    }
  }
  return pdfDoc.save()
}

export async function addPageNumbers(file, options = {}) {
  const pdfDoc = await loadPdfDocument(file)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont('Helvetica')
  const { position = 'bottom-center', fontSize = 12, startFrom = 1 } = options

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width, height } = page.getSize()
    const pageNum = String(i + startFrom)
    const textWidth = font.widthOfTextAtSize(pageNum, fontSize)

    let x, y
    switch (position) {
      case 'bottom-center':
        x = (width - textWidth) / 2
        y = 30
        break
      case 'bottom-right':
        x = width - textWidth - 30
        y = 30
        break
      case 'bottom-left':
        x = 30
        y = 30
        break
      case 'top-center':
        x = (width - textWidth) / 2
        y = height - 30
        break
      case 'top-right':
        x = width - textWidth - 30
        y = height - 30
        break
      case 'top-left':
        x = 30
        y = height - 30
        break
      default:
        x = (width - textWidth) / 2
        y = 30
    }

    page.drawText(pageNum, { x, y, size: fontSize, font })
  }
  return pdfDoc.save()
}

export async function cropPdf(file, cropAreas) {
  const pdfDoc = await loadPdfDocument(file)
  const pages = pdfDoc.getPages()

  cropAreas.forEach(({ pageIndex, x, y, width, height }) => {
    if (pageIndex < pages.length) {
      const page = pages[pageIndex]
      page.setCropBox(x, y, width, height)
      page.setMediaBox(x, y, width, height)
    }
  })
  return pdfDoc.save()
}

export async function reorderPages(file, newOrder) {
  const srcDoc = await loadPdfDocument(file)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder)
  copiedPages.forEach(page => newDoc.addPage(page))
  return newDoc.save()
}

export async function imagesToPdf(imageFiles) {
  const pdfDoc = await PDFDocument.create()
  
  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    let image
    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(uint8Array)
    } else {
      image = await pdfDoc.embedJpg(uint8Array)
    }
    
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }
  return pdfDoc.save()
}
