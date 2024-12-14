import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      {/*<a href={baseDir}>{title}</a>*/}
      <a href={baseDir}>
        <img class="page-title-img" src="../static/my-image.png" alt="Jinhyeok's Portfolio" />
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
}

.page-title-img {
  width: 50px;
  height: auto;
  border-radius: 50%;
  object-fit: cover;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
