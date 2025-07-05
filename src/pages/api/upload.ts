// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File as FormidableFile } from 'formidable'
import fs from 'fs'
import FormData from 'form-data'
import axios from 'axios'

export const config = {
  api: { bodyParser: false } 
}

type Data = { url?: string; error?: string }

const IMGBB_API_KEY = 'bbc3a53a3115738135e422ae4fb26173'
const IMGBB_ENDPOINT = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const form = formidable({ multiples: false })

  form.parse(req, async (err, _fields, files) => {
    if (err) {
      console.error('Form parse error:', err)
      return res.status(500).json({ error: 'Form parse error' })
    }
    const fileField = (files as any).file
    let file: FormidableFile
    if (Array.isArray(fileField) ? fileField.length : fileField) {
      file = Array.isArray(fileField) ? fileField[0] : fileField
    } else {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    try {
      const tmpPath = (file as any).filepath ?? (file as any).path

      const formData = new FormData()
      formData.append(
        'image',
        fs.createReadStream(tmpPath),
        file.originalFilename || file.newFilename
      )

      const { data } = await axios.post(IMGBB_ENDPOINT, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,      
        maxBodyLength: Infinity
      })

      if (!data?.success) {
        console.error('imgbb error payload:', data)
        return res.status(500).json({ error: 'Upload to imgbb failed' })
      }

      return res.status(200).json({ url: data.data.url as string })
    } catch (uploadErr) {
      console.error('imgbb upload error:', uploadErr)
      return res.status(500).json({ error: 'Upload to imgbb failed' })
    }
  })
}
