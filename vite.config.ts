import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const base =
    process.env.VITE_BASE ?? (command === 'build' && repoName ? `/${repoName}/` : '/')

  return {
    base,
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
