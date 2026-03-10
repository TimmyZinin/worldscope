export interface Webcam {
  webcamId: number
  title: string
  status: 'active' | 'inactive'
  lastUpdatedOn: string
  location: {
    city: string
    region: string
    country: string
    countryCode: string
    latitude: number
    longitude: number
  }
  images?: {
    current?: {
      icon: string
      thumbnail: string
      preview: string
    }
  }
  player?: {
    day: string
    month: string
    lifetime: string
  }
}
