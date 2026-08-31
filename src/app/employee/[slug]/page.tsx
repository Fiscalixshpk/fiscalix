import { redirect } from 'next/navigation'

export default async function EmployeeIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/employee/${slug}/login`)
}
