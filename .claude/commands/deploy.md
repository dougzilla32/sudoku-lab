Deploy the app to Netlify.

Steps:
1. Run `npm run build` in the project root
2. If the build fails, read the error output, fix the problem, and try again
3. Once the build succeeds, run `netlify deploy --prod --dir=dist`
4. Read the output to confirm the deploy succeeded and find the deploy URL
5. Run `open <deploy-url>` to open the live app in the browser
6. Tell the student the URL in a friendly message like:
   "Your app is live! 🎉 sudoku-lab.netlify.app"

If the build or deploy fails after two attempts, stop and explain clearly
what went wrong in plain language so the student understands the problem.
