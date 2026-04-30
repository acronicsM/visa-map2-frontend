/* External hero URLs; превью без конфигурации remotePatterns для next/image */
/* eslint-disable @next/next/no-img-element */

export default function AzureArticlesBento() {
  return (
    <section className="bg-surface-container-low py-24 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-6 auto-rows-[250px] md:grid-cols-12">
          <div className="relative group md:col-span-8 md:row-span-2 overflow-hidden rounded-[2rem]">
            <img
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt=""
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH-SxgfsDFfcLp_h52s-DitRk4lDkvY_4ciJ1GMlTXHxe6IlfvPPFvC9c6IZUMvvHZEQXq2lXYAzNjje5Or-9H-IB3kvkqFL_Jzy2QQYJyeh-e_PJCi8WwskujVooWj1AeVHKIdJUvcGRoRnPYWkgSiEqSMoTRmuz4HjEbKSsbERu0KRaeC2YQe6m9ChNyOX32QFr5eEJj5kQmtNKfjj2IJjUFoQbC-_r-4_2QHnBJ3_czhW5pCaZ97Jf2RiKm7Xx3x-3l9naHqcUk"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 p-10">
              <span className="mb-4 inline-block rounded-full bg-primary px-4 py-1 text-xs font-bold text-on-primary">
                Путешествия
              </span>
              <h3 className="azure-font-headline mb-4 max-w-lg text-4xl font-extrabold leading-tight text-white">
                Как планировать перелёты и визы: краткий гайд VisaMap
              </h3>
              <p className="max-w-md text-sm text-white/80">
                Подбирайте страны под гражданство, бюджет и сезон — на одной карте.
              </p>
            </div>
          </div>

          <div className="relative group md:col-span-4 overflow-hidden rounded-[2rem] bg-primary-container">
            <img
              className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-110"
              alt=""
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2TXwmv6dZgqem7WIAxKXakCrY8R5xjg_4zGNNeRwRk-sGe7CNt-I8W_3bmv1gO3p9LOWC8XUdfXaPICRww4mPydQGHcZmljCzCO161njcgFuxT2Y8ml_O1JiaH8KbvvGLuSYfGU2q6VG9p6PROImp2nJSI6PX4-ILzC2wKHvwhGTjUjx49NZy0ilux00CpeGY6dE7DBBURmodogBsFYwqliVAIDkFIRdEpkYUa9v5wduvF77TWZpmyXPtyj82Vz2-CYYqMW5QuCnX"
            />
            <div className="relative flex h-full flex-col justify-end p-8">
              <h3 className="azure-font-headline text-2xl font-bold leading-tight text-on-primary-container">
                Скрытые направления, куда действительно проще с визой
              </h3>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-on-primary-container">
                Далее{" "}
                <span className="material-symbols-outlined text-sm" aria-hidden>
                  north_east
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[2rem] bg-secondary p-8 md:col-span-4">
            <span className="material-symbols-outlined text-4xl text-on-secondary" aria-hidden>
              flight_takeoff
            </span>
            <div>
              <h3 className="azure-font-headline text-2xl font-bold leading-tight text-on-secondary">
                Минимум вещей в дорогу
              </h3>
              <p className="mt-2 text-xs text-on-secondary/70 azure-font-body">
                Чек-лист для поездки без лишней сумки — скоро в блоге VisaMap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
