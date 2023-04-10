import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function authRoutes(fastify: FastifyInstance) {
    fastify.get('/me', {
        onRequest: [authenticate],
    }, async (request) => {
        return { user: request.user }
    })

    fastify.post('/users', async (request) => {
        const createUserBody = z.object({
            access_token: z.string(),

        })



        const { access_token } = createUserBody.parse(request.body)

        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${access_token}`,
            }
        })

        const userData = await userResponse.json()

        const userInfoSchema = z.object({
            id: z.string(),
            email: z.string().email(),
            name: z.string(),
            picture: z.string().url(),
        })

        const userInfo = userInfoSchema.parse(userData)

        let user = await prisma.user.findUnique({
            where: {
                googleId: userInfo.id,
            }
        })
        if (!user) {
            user = await prisma.user.create({
                data: {
                    googleId: userInfo.id,
                    name: userInfo.name,
                    email: userInfo.email,
                    avatarUrl: userInfo.picture,
                }
            })
        }

        const token = fastify.jwt.sign({
            name: user.name,
            avatarUrl: user.avatarUrl,
        }, {
            sub: user.id,
            expiresIn: '7 days',
        })

        return { token }
    })

}

//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQm9uZWNvbGFuZGlhIiwiYXZhdGFyVXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUdObXl4YWRDVXgwTWRVTXdJRzNSZ2ZmTlpkbXhJZ1V0YmpBSVJhY0tLYWh2dz1zOTYtYyIsInN1YiI6ImNsZWtqc2x2NTAwMDB0dXVvZGRsbHhvajciLCJpYXQiOjE2NzczNjQ5NjksImV4cCI6MTY3Nzk2OTc2OX0.ce8Fdii1XeqvpO2xVRGw7Pztex3UDAdUiJbRzIv3IC0