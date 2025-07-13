import { db } from '@/db';
import { users } from '@/db/schema';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const roles = [
	{ value: 'admin', label: 'Admin' },
	{ value: 'supervisor', label: 'Supervisor' },
	{ value: 'manager', label: 'Manager' },
	{ value: 'user', label: 'User' },
];

async function updateUserRole(
	userId: number,
	newRole: 'admin' | 'supervisor' | 'manager' | 'user'
) {
	'use server';
	await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
	revalidatePath('/admin/users');
}

export default async function AdminUsersPage() {
	const session = await getServerSession(authOptions);
	if (!session?.user || session.user.role !== 'admin') {
		redirect('/home');
	}
	const allUsers = await db.select().from(users);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<PageContainer className="flex items-center justify-center">
				<Card className="shadow-lg w-full max-w-3xl">
					<CardHeader>
						<Link href="/home">
							<Button
								variant="outline"
								className="mb-4 flex items-center gap-2"
							>
								<ArrowLeft className="w-4 h-4" />
								Back to Home
							</Button>
						</Link>
						<CardTitle className="text-2xl font-bold">
							User Administration
						</CardTitle>
					</CardHeader>
					<CardContent>
						<table className="min-w-full border rounded-md bg-white dark:bg-zinc-900">
							<thead>
								<tr className="border-b">
									<th className="px-4 py-2 text-left">Name</th>
									<th className="px-4 py-2 text-left">Email</th>
									<th className="px-4 py-2 text-left">Role</th>
								</tr>
							</thead>
							<tbody>
								{allUsers.map((user) => (
									<tr
										key={user.id}
										className="border-b hover:bg-muted/50"
									>
										<td className="px-4 py-2">{user.name}</td>
										<td className="px-4 py-2">{user.email}</td>
										<td className="px-4 py-2 capitalize">
											<form
												action={async (formData) => {
													'use server';
													const newRole =
														formData.get('role') as
														| 'admin'
														| 'supervisor'
														| 'manager'
														| 'user';
													await updateUserRole(user.id, newRole);
												}}
											>
												<Select
													name="role"
													defaultValue={user.role}
												>
													<SelectTrigger className="w-36">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{roles.map((role) => (
															<SelectItem
																key={role.value}
																value={role.value}
															>
																{role.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<button
													type="submit"
													className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded"
												>
													Save
												</button>
											</form>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</PageContainer>
		</div>
	);
}