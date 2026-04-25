const GRAPH_VERSION = "v25.0";

// Cole aqui TEMPORARIAMENTE seu token de usuário do Graph Explorer
const USER_ACCESS_TOKEN = "COLE_SEU_TOKEN_AQUI";

async function graph(path) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", USER_ACCESS_TOKEN);

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Erro Meta:", data.error || data);
    process.exit(1);
  }

  return data;
}

async function main() {
  const result = await graph(
    "/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name}"
  );

  const pages = result.data || [];

  if (!pages.length) {
    console.log("Nenhuma página encontrada.");
    return;
  }

  console.log("\nPÁGINAS ENCONTRADAS:\n");

  for (const page of pages) {
    console.log("--------------------------------");
    console.log("Página:", page.name);
    console.log("Categoria:", page.category);
    console.log("META_FACEBOOK_PAGE_ID=", page.id);
    console.log("META_GRAPH_API_TOKEN=", page.access_token);

    if (page.instagram_business_account?.id) {
      console.log(
        "META_INSTAGRAM_BUSINESS_ID=",
        page.instagram_business_account.id
      );
      console.log(
        "Instagram username=",
        page.instagram_business_account.username || "não retornou"
      );
    } else {
      console.log("META_INSTAGRAM_BUSINESS_ID= NÃO CONECTADO");
    }
  }

  console.log("--------------------------------\n");
}

main();