const { DateTime } = require("luxon");
const pluginSEO = require("eleventy-plugin-seo");

/**
* This is the JavaScript code that determines the config for your Eleventy site
*
* You can add lost of customization here to define how the site builds your content
* Try extending it to suit your needs!
*/

module.exports = function(eleventyConfig) {
  eleventyConfig.setTemplateFormats([
    // Templates:
    "html",
    "njk",
    "md",
    // Static Assets:
    "css",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "woff",
    "woff2"
  ]);
  eleventyConfig.addPassthroughCopy("public");

  /* From: https://github.com/artstorm/eleventy-plugin-seo
  
  Adds SEO settings to the top of all pages
  */
  const seo = require("./src/seo.json");
  const port = process.env.PORT || 8080;
  const configuredUrl = (seo.url || "").replace(/\/$/, "");

  seo.url =
    process.env.CODESPACES === "true" &&
    process.env.CODESPACE_NAME &&
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
      ? `https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : configuredUrl || "https://our-food-challenge.pages.dev";
  eleventyConfig.addPlugin(pluginSEO, seo);

  // Filters let you modify the content https://www.11ty.dev/docs/filters/
  eleventyConfig.addFilter("htmlDateString", dateObj => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });

  eleventyConfig.addFilter("splitFirstParagraph", html => {
    const source = `${html || ""}`;
    const match = source.match(/<\/p>/i);

    if (!match || typeof match.index !== "number") {
      return { lead: "", rest: source };
    }

    const splitIndex = match.index + match[0].length;
    return {
      lead: source.slice(0, splitIndex),
      rest: source.slice(splitIndex),
    };
  });

  eleventyConfig.setBrowserSyncConfig({ ghostMode: false });

  /* Build the collection of posts to list in the site
     - Read the Next Steps post to learn how to extend this
  */
  eleventyConfig.addCollection("posts", function(collection) {
    
    /* The posts collection includes all posts that list 'posts' in the front matter 'tags'
       - https://www.11ty.dev/docs/collections/
    */
    
    // EDIT HERE WITH THE CODE FROM THE NEXT STEPS PAGE TO REVERSE CHRONOLOGICAL ORDER
    // (inspired by https://github.com/11ty/eleventy/issues/898#issuecomment-581738415)
    const coll = collection
      .getFilteredByTag("posts")//;
      .sort((a, b) => {
        // Date then title
        if(a.data.date && b.data.date ){
          return a.data.date - b.data.date
        }
        if(a.data.date ){
          return -1
        }
        
        if (a.title && b.title){
          
        
          const atitle = a.title.replaceAll("The ", "")
          const btitle = b.title.replaceAll("The ", "")

          if (atitle < btitle) {
            return -1;
          }
          if (atitle > btitle) {
            return 1;
          }
        } else if (a.title){
           return -1;
        } else {
           return 1;
        }
        return 0;
      });
     
    // From: https://github.com/11ty/eleventy/issues/529#issuecomment-568257426 
    // Adds {{ prevPost.url }} {{ prevPost.data.title }}, etc, to our njks templates
    for (let i = 0; i < coll.length; i++) {
      const prevPost = coll[i - 1];
      const nextPost = coll[i + 1];

      coll[i].data["prevPost"] = prevPost;
      coll[i].data["nextPost"] = nextPost;
    }

    return coll;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "build"
    }
  };
};
