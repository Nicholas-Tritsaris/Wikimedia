import os
import requests
from groq import Groq

# Configuration
GITHUB_USERNAME = os.getenv("GITHUB_REPOSITORY_OWNER", "Nicholas-Tritsaris")
CONTENT_DIR = "content"
MAIN_PAGE_PATH = os.path.join(CONTENT_DIR, "Main_Page.mw")
PROJECTS_PAGE_PATH = os.path.join(CONTENT_DIR, "Projects.mw")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# Initialize Groq client
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set. Skipping generation.")

client = Groq(api_key=GROQ_API_KEY)


def get_repositories():
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    url = f"https://api.github.com/users/{GITHUB_USERNAME}/repos?per_page=100"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


def get_repo_readme(repo_name):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{repo_name}/readme"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        download_url = response.json().get("download_url")
        content_response = requests.get(download_url)
        return content_response.text
    return ""


def generate_wiki_article(repo):
    name = repo["name"]
    description = repo.get("description", "No description provided.")
    readme = get_repo_readme(name)

    prompt = f"""
Create a Wikipedia-style article in Wikitext format for the following GitHub repository:
Repo Name: {name}
Description: {description}
README Content:
{readme[:2000]}

Formatting Rules:
- Use == Header 2 == and === Header 3 === for sections.
- Use '''Bold''' for key terms and ''Italic'' for emphasis.
- Use [[Link Name]] for internal wiki links.
- Use [URL Label] for external links.
- Start with a summary paragraph.
- Include sections like "Overview", "Features", and "Installation" if applicable.
- Do not include the title in the output (the page title is the filename).
- Output ONLY the Wikitext content.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that writes professional "
                    "Wikipedia articles in Wikitext format."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_completion_tokens=1200,
    )
    return response.choices[0].message.content


def main():
    repos = get_repositories()
    repo_links = []

    for repo in repos:
        name = repo["name"]
        if name == GITHUB_USERNAME:  # Skip the profile repo if desired
            continue

        filename = f"{name}.mw"
        filepath = os.path.join(CONTENT_DIR, filename)

        # Caching: skip if already exists to save tokens and Git noise
        if os.path.exists(filepath):
            print(f"Skipping {name}, article already exists.")
            repo_links.append(f"* [[{name}]]")
            continue

        print(f"Generating article for {name}...")
        try:
            article_content = generate_wiki_article(repo)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(article_content)
            repo_links.append(f"* [[{name}]]")
        except Exception as e:
            print(f"Failed to generate article for {name}: {e}")

    # Update Projects Page with links to all repos
    if repo_links:
        with open(PROJECTS_PAGE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # Check if "=== Repositories ===" already exists
        repos_section_index = -1
        for i, line in enumerate(lines):
            if "=== Repositories ===" in line:
                repos_section_index = i
                break

        new_repos_content = "=== Repositories ===\n" + "\n".join(repo_links) + "\n\n"

        if repos_section_index != -1:
            # Find the end of the section (the next header or end of file)
            end_index = len(lines)
            for i in range(repos_section_index + 1, len(lines)):
                if lines[i].startswith("=="):
                    end_index = i
                    break
            lines[repos_section_index:end_index] = [new_repos_content]
        else:
            lines.append("\n" + new_repos_content)

        with open(PROJECTS_PAGE_PATH, "w", encoding="utf-8") as f:
            f.writelines(lines)

        # Also update Main Page to show a link to the Projects page
        with open(MAIN_PAGE_PATH, "r", encoding="utf-8") as f:
            main_lines = f.readlines()

        if not any("Browse all project repositories" in line for line in main_lines):
            nav_index = -1
            for i, line in enumerate(main_lines):
                if "== Navigation ==" in line:
                    nav_index = i
                    break

            project_link_msg = "* [[Projects|Browse all project repositories]]\n"
            if nav_index != -1:
                main_lines.insert(nav_index + 1, project_link_msg)
                with open(MAIN_PAGE_PATH, "w", encoding="utf-8") as f:
                    f.writelines(main_lines)


if __name__ == "__main__":
    main()
