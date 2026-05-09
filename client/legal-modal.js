(() => {
    const LEGAL_UPDATED_LABEL = 'Хамгийн сүүлд шинэчлэгдсэн: 2026 оны 1-р сарын 1';
    let previousBodyOverflow = '';

    const privacyContent = `
        <div class="legal-document">
            <div class="legal-toc">
                <p class="legal-toc-title">Агуулга</p>
                <ol>
                    <li><a href="#privacy-s1">Бид ямар мэдээлэл цуглуулдаг вэ</a></li>
                    <li><a href="#privacy-s2">Мэдээллийг хэрхэн ашигладаг вэ</a></li>
                    <li><a href="#privacy-s3">Мэдээллийг гуравдагч этгээдэд дамжуулах</a></li>
                    <li><a href="#privacy-s4">Күүки болон технологийн хэрэгслүүд</a></li>
                    <li><a href="#privacy-s5">Мэдээллийн аюулгүй байдал</a></li>
                    <li><a href="#privacy-s6">Таны эрхүүд</a></li>
                    <li><a href="#privacy-s7">Мэдээллийг хадгалах хугацаа</a></li>
                    <li><a href="#privacy-s8">Хүүхдийн нууцлал</a></li>
                    <li><a href="#privacy-s9">Бодлогын өөрчлөлт</a></li>
                    <li><a href="#privacy-s10">Холбоо барих</a></li>
                </ol>
            </div>

            <div class="legal-highlight">
                <p>Энэхүү нууцлалын бодлого нь <strong>unafurniture.com</strong> вэбсайтад хамаарна. Манай сайтыг ашигласнаар та энэхүү бодлогыг зөвшөөрч байна.</p>
            </div>

            <section class="legal-section" id="privacy-s1">
                <p class="legal-section-number">01</p>
                <h3>Бид ямар мэдээлэл цуглуулдаг вэ</h3>
                <p>Та манай сайтыг ашиглах явцад дараах мэдээллийг цуглуулж болно:</p>
                <ul>
                    <li><strong>Хувийн мэдээлэл:</strong> Нэр, имэйл хаяг, утасны дугаар, хүргэлтийн хаяг — бүртгэл үүсгэх, захиалга өгөх, эсвэл бидэнтэй холбоо барих үед.</li>
                    <li><strong>Захиалгын мэдээлэл:</strong> Худалдан авалтын түүх, захиалгын дэлгэрэнгүй, гүйлгээний лавлах код.</li>
                    <li><strong>Техникийн мэдээлэл:</strong> IP хаяг, хөтчийн төрөл, үйлдлийн систем, манай сайтад зочлох хугацаа болон хуудасны мэдээлэл.</li>
                    <li><strong>Харилцааны мэдээлэл:</strong> Та бидэнд илгээсэн зурвас, санал гомдол.</li>
                </ul>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s2">
                <p class="legal-section-number">02</p>
                <h3>Мэдээллийг хэрхэн ашигладаг вэ</h3>
                <p>Цуглуулсан мэдээллийг дараах зорилгоор ашигладаг:</p>
                <ul>
                    <li>Захиалгыг боловсруулж, хүргэлтийн мэдэгдэл явуулах</li>
                    <li>Хэрэглэгчийн бүртгэл удирдах, нэвтрэх эрхийг баталгаажуулах</li>
                    <li>Худалдан авалтын өмнө болон дараах үйлчилгээ үзүүлэх</li>
                    <li>Таны асуусан асуулт, гомдолд хариу өгөх</li>
                    <li>Хуулиар шаардлагатай тохиолдолд эрх бүхий байгууллагад мэдэгдэх</li>
                    <li>Сайтын аюулгүй байдал, урвуулан ашиглалтаас хамгаалах</li>
                </ul>
                <p>Таны мэдээллийг зөвшөөрөлгүйгээр гуравдагч этгээдэд борлуулахгүй.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s3">
                <p class="legal-section-number">03</p>
                <h3>Мэдээллийг гуравдагч этгээдэд дамжуулах</h3>
                <p>Зөвхөн дараах нөхцөлд мэдээллийг гуравдагч этгээдэд дамжуулж болно:</p>
                <ul>
                    <li><strong>Хүргэлтийн үйлчилгээ:</strong> Захиалгыг хүргэхийн тулд логистикийн компанид шаардлагатай мэдээллийг дамжуулна.</li>
                    <li><strong>Банк, төлбөрийн систем:</strong> Гүйлгээ баталгаажуулахад шаардлагатай мэдээлэл.</li>
                    <li><strong>Хуулийн шаардлага:</strong> Монгол Улсын хууль тогтоомжийн дагуу шаардлагатай тохиолдолд.</li>
                </ul>
                <p>Бид гуравдагч этгээдүүд нь таны мэдээллийг зохих хамгаалалттай ашиглахыг шаарддаг.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s4">
                <p class="legal-section-number">04</p>
                <h3>Күүки болон технологийн хэрэгслүүд</h3>
                <p>Манай сайт дараах зорилгоор күүки ашигладаг:</p>
                <ul>
                    <li><strong>Нэвтрэх сессийг хадгалах:</strong> Та нэвтэрсний дараа сессийг таних.</li>
                    <li><strong>Сагсны мэдээлэл:</strong> Та хуудас шилжих үед сагсны агуулгыг хадгалах.</li>
                    <li><strong>Сайтын ажиллагааг дэмжих:</strong> Хэрэглэгчийн туршлагыг сайжруулах.</li>
                </ul>
                <p>Хөтчийнхөө тохиргооноос күүкийг хаах боломжтой боловч зарим функц ажиллахаа больж болно.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s5">
                <p class="legal-section-number">05</p>
                <h3>Мэдээллийн аюулгүй байдал</h3>
                <p>Таны хувийн мэдээллийг хамгаалахын тулд:</p>
                <ul>
                    <li>Бүх холболт HTTPS протоколоор шифрлэгддэг</li>
                    <li>Нууц үгийг хэзээ ч текст хэлбэрээр хадгалдаггүй — зөвхөн нэг талын шифрлэлтэй (bcrypt) хадгалдаг</li>
                    <li>Cloudflare Workers болон D1 дэд бүтцийг аюулгүй байдлын өндөр стандартаар ажиллуулдаг</li>
                    <li>Зөвшөөрөлгүй хандалтаас хамгаалах хяналтын системтэй</li>
                </ul>
                <div class="legal-highlight">
                    <p>Интернэтэд 100% аюулгүй систем байдаггүй. Та нууц үгийн аюулгүй байдалд анхаарал хандуулж, ямар нэгэн сэжигтэй үйл ажиллагааг бидэнд мэдэгдэнэ үү.</p>
                </div>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s6">
                <p class="legal-section-number">06</p>
                <h3>Таны эрхүүд</h3>
                <p>Та дараах эрхтэй:</p>
                <ul>
                    <li><strong>Мэдэх эрх:</strong> Бид таны ямар мэдээлэл хадгалж байгааг асуух боломжтой.</li>
                    <li><strong>Засах эрх:</strong> Хувийн мэдээллийн алдааг засахыг хүсэх боломжтой.</li>
                    <li><strong>Устгах эрх:</strong> Бүртгэлийг устгаж, мэдээллийг хасахыг хүсэх боломжтой.</li>
                    <li><strong>Татгалзах эрх:</strong> Мэдэгдэл болон маркетингийн имэйлийн хүлээн авалтаас татгалзах боломжтой.</li>
                </ul>
                <p>Эдгээр эрхээ хэрэгжүүлэхийн тулд <a href="mailto:una.furniture@outlook.com">una.furniture@outlook.com</a>-д хандана уу.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s7">
                <p class="legal-section-number">07</p>
                <h3>Мэдээллийг хадгалах хугацаа</h3>
                <p>Захиалгын мэдээллийг Монгол Улсын санхүүгийн тайлагналын шаардлагын дагуу <strong>5 жил</strong> хадгална. Бүртгэлийн болон харилцааны мэдээллийг бүртгэл хаасны дараа <strong>2 жил</strong> хадгалаад устгана. Маркетингийн мэдээлэл татгалзсан өдрөөс хойш нэн даруй устгагдана.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s8">
                <p class="legal-section-number">08</p>
                <h3>Хүүхдийн нууцлал</h3>
                <p>Манай үйлчилгээ 16 наснаас доош хүүхдэд зориулагдаагүй. Хэрэв 16 наснаас доош хүүхдийн мэдээлэл цуглуулагдсан гэж сэжиглэвэл бидэнтэй нэн даруй холбоо барина уу — тухайн мэдээллийг устгах арга хэмжээ авна.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s9">
                <p class="legal-section-number">09</p>
                <h3>Бодлогын өөрчлөлт</h3>
                <p>Энэхүү нууцлалын бодлогыг цаг үе тутам шинэчилж болно. Томоохон өөрчлөлт орсон тохиолдолд бүртгэлтэй имэйл хаягт мэдэгдэл явуулна. Шинэчлэгдсэн огноо дээр дарсан огноог харна уу.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="privacy-s10">
                <p class="legal-section-number">10</p>
                <h3>Холбоо барих</h3>
                <p>Нууцлалын асуудалтай холбоотой асуулт, хүсэлт байвал:</p>
                <ul>
                    <li><strong>Имэйл:</strong> una.furniture@outlook.com</li>
                    <li><strong>Вэбсайт:</strong> unafurniture.com</li>
                    <li><strong>Хаяг:</strong> Улаанбаатар, Монгол Улс</li>
                </ul>
                <p>Ажлын өдрүүдэд 09:00–18:00 цагийн хооронд 1–2 ажлын өдрийн дотор хариу өгнө.</p>
            </section>

            <div class="legal-contact-card">
                <p>Нууцлалын асуудлаар бидэнтэй холбоо барих</p>
                <a href="mailto:una.furniture@outlook.com">una.furniture@outlook.com</a>
            </div>
        </div>
    `;

    const termsContent = `
        <div class="legal-document">
            <div class="legal-toc">
                <p class="legal-toc-title">Агуулга</p>
                <ol>
                    <li><a href="#terms-s1">Ерөнхий нөхцөл</a></li>
                    <li><a href="#terms-s2">Бүртгэл болон нэвтрэлт</a></li>
                    <li><a href="#terms-s3">Бүтээгдэхүүн болон үнэ</a></li>
                    <li><a href="#terms-s4">Захиалга болон төлбөр</a></li>
                    <li><a href="#terms-s5">Хүргэлтийн нөхцөл</a></li>
                    <li><a href="#terms-s6">Буцаалт болон солилцоо</a></li>
                    <li><a href="#terms-s7">Хориглогдсон үйлдлүүд</a></li>
                    <li><a href="#terms-s8">Оюуны өмч</a></li>
                    <li><a href="#terms-s9">Хариуцлагын хязгаарлалт</a></li>
                    <li><a href="#terms-s10">Маргаан шийдвэрлэх</a></li>
                    <li><a href="#terms-s11">Нөхцөлийн өөрчлөлт</a></li>
                    <li><a href="#terms-s12">Холбоо барих</a></li>
                </ol>
            </div>

            <div class="legal-highlight">
                <p>Та <strong>unafurniture.com</strong> сайтыг ашиглах, бүртгэл үүсгэх, эсвэл захиалга өгөх замаар энэхүү нөхцөлийг бүрэн зөвшөөрч байна. Нөхцөлийг зөвшөөрөхгүй бол үйлчилгээг ашиглахаас татгалзана уу.</p>
            </div>

            <section class="legal-section" id="terms-s1">
                <p class="legal-section-number">01</p>
                <h3>Ерөнхий нөхцөл</h3>
                <p>Энэхүү үйлчилгээний нөхцөл нь UNA Home & Furniture (цаашид "бид", "манай компани") болон манай вэбсайт unafurniture.com-ийг ашиглагч ("та", "хэрэглэгч") хооронд үүсэх харилцааг зохицуулна.</p>
                <p>Манай үйлчилгээ нь Монгол Улсын хуулийн хүрээнд ажилладаг бөгөөд бүх харилцааны талд Монгол Улсын хууль тогтоомж хэрэглэгдэнэ.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s2">
                <p class="legal-section-number">02</p>
                <h3>Бүртгэл болон нэвтрэлт</h3>
                <p>Манай сайтад бүртгүүлэхдээ:</p>
                <ul>
                    <li>Бодит, үнэн зөв мэдээлэл оруулах үүрэгтэй.</li>
                    <li>Нэвтрэх нэр болон нууц үгийн нууцлалыг өөрөө хадгалах хариуцлага хүлээнэ.</li>
                    <li>Нэг хүн зөвхөн нэг бүртгэл үүсгэх боломжтой.</li>
                    <li>Бүртгэлийг бусдад дамжуулах, хуваалцахыг хориглоно.</li>
                </ul>
                <p>Бүртгэлд зөвшөөрөлгүй хандалт илэрсэн тохиолдолд нэн даруй <a href="mailto:una.furniture@outlook.com">una.furniture@outlook.com</a>-д мэдэгдэнэ үү.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s3">
                <p class="legal-section-number">03</p>
                <h3>Бүтээгдэхүүн болон үнэ</h3>
                <ul>
                    <li>Сайтад харагдах бүх үнэ нь Монгол төгрөгөөр (₮) илэрхийлэгдэнэ.</li>
                    <li>Бид дурын бүтээгдэхүүний үнийг урьдчилан мэдэгдэлгүйгээр өөрчлөх эрхтэй.</li>
                    <li>Бүтээгдэхүүний зураг, дүрслэл нь лавлагааны зорилготой бөгөөд бодит бүтээгдэхүүн бага зэрэг ялгаатай байж болно.</li>
                    <li>Захиалга баталгаажсаны дараа тухайн захиалгын үнэ тогтмол байна.</li>
                    <li>Зарим бүтээгдэхүүн нь нөөцийн хязгаарлалттай байж болно. Нөөц дуусвал захиалга цуцлагдаж, төлбөрийг буцаан олгоно.</li>
                </ul>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s4">
                <p class="legal-section-number">04</p>
                <h3>Захиалга болон төлбөр</h3>
                <p>Захиалга өгөх явц:</p>
                <ol>
                    <li>Бүтээгдэхүүнийг сагсанд нэмж, checkout хуудас руу шилжинэ.</li>
                    <li>Хүргэлтийн хаяг болон холбоо барих мэдээллийг бөглөнө.</li>
                    <li>Манай банкны дансанд шилжүүлэг хийж, гүйлгээний лавлах кодыг оруулна.</li>
                    <li>Захиалга баталгаажсаны дараа имэйл мэдэгдэл хүлээн авна.</li>
                </ol>
                <div class="legal-warning">
                    <p>Гүйлгээний лавлах код буруу эсвэл мэдэгдэлгүй шилжүүлэг хийгдсэн тохиолдолд захиалгын боловсруулалт удаашрах эсвэл цуцлагдах боломжтой. Төлбөрийн асуудал гарвал бидэнтэй холбоо барина уу.</p>
                </div>
                <p>Захиалга баталгаажсаны дараа бид таны захиалгыг <strong>1–2 ажлын өдрийн</strong> дотор баталгаажуулж, хүргэлтийн хугацааны талаар мэдэгдэл явуулна.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s5">
                <p class="legal-section-number">05</p>
                <h3>Хүргэлтийн нөхцөл</h3>
                <ul>
                    <li><strong>Хүргэлтийн хамрах хүрээ:</strong> Улаанбаатар хот болон хэлэлцээрийн үндсэн дээр орон нутгийг хамарна.</li>
                    <li><strong>Хүргэлтийн хугацаа:</strong> Улаанбаатар дотор 2–5 ажлын өдөр. Орон нутаг болон том хэмжээний тавилгын хувьд нэмэлт хугацаа шаардагдана.</li>
                    <li><strong>Хүргэлтийн төлбөр:</strong> Захиалгын дүн болон байршлаас хамааран тооцогдох бөгөөд checkout хуудсанд харагдана.</li>
                    <li><strong>Хүргэлт хийх боломжгүй тохиолдол:</strong> Буруу хаяг, холбоо барих боломжгүй байдлын улмаас хүргэлт амжилтгүй болбол дахин хүргэлтийн нэмэлт төлбөр тооцогдоно.</li>
                </ul>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s6">
                <p class="legal-section-number">06</p>
                <h3>Буцаалт болон солилцоо</h3>
                <p>Та дараах нөхцөлд захиалгаа буцааж эсвэл солих боломжтой:</p>
                <ul>
                    <li><strong>Хүлээн авсанаас хойш 7 хоногийн дотор</strong> бүтээгдэхүүн гэмтэлтэй, хүргэгдсэн бол буцаалт хийгдэнэ.</li>
                    <li>Бүтээгдэхүүн нь анхны байдлаараа, ашиглагдаагүй, савлагаатай байх шаардлагатай.</li>
                    <li>Захиалгат (custom-made) бүтээгдэхүүнийг буцаах боломжгүй — зөвхөн үйлдвэрийн гэмтэлтэй тохиолдолд солино.</li>
                </ul>
                <div class="legal-highlight">
                    <p>Буцаалт хийхийн өмнө заавал <a href="mailto:una.furniture@outlook.com">una.furniture@outlook.com</a>-д захиалгын дугаар болон асуудлын тайлбарыг явуулна уу. Зөвшөөрөлгүй буцаалтыг хүлээн авахгүй.</p>
                </div>
                <p>Буцаалт зөвшөөрөгдсөн тохиолдолд төлбөрийг <strong>5–10 ажлын өдрийн</strong> дотор буцаан олгоно.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s7">
                <p class="legal-section-number">07</p>
                <h3>Хориглогдсон үйлдлүүд</h3>
                <p>Манай сайтыг ашиглахдаа дараах үйлдлийг хориглоно:</p>
                <ul>
                    <li>Хуурамч мэдээллээр бүртгэл үүсгэх, бусдын мэдээллийг ашиглах</li>
                    <li>Системийн аюулгүй байдлыг зөрчих, хакерын оролдлого хийх</li>
                    <li>Автомат програм ашиглан сайтыг хэт ачааллах (bot, scraper)</li>
                    <li>Хуурамч захиалга өгч, төлбөр хийхгүй орхих</li>
                    <li>Манай агуулгыг зөвшөөрөлгүйгээр хуулбарлах, ашиглах</li>
                </ul>
                <p>Эдгээр нөхцөлийг зөрчсөн тохиолдолд бид таны бүртгэлийг урьдчилан мэдэгдэлгүйгээр хаах, шаардлагатай тохиолдолд эрх бүхий байгууллагад мэдэгдэх эрхтэй.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s8">
                <p class="legal-section-number">08</p>
                <h3>Оюуны өмч</h3>
                <p>Манай сайтын бүх агуулга — лого, зураг, текст, загвар — нь UNA Home & Furniture-ийн эсвэл зохих зөвшөөрлийн дагуу ашиглагдаж буй гуравдагч этгээдийн өмч юм.</p>
                <p>Та манай агуулгыг зөвхөн хувийн, арилжааны бус зорилгоор ашиглах боломжтой. Ямар нэгэн агуулгыг хуулбарлах, дахин нийтлэх, худалдаалахын тулд бидний бичгэн зөвшөөрөл авах шаардлагатай.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s9">
                <p class="legal-section-number">09</p>
                <h3>Хариуцлагын хязгаарлалт</h3>
                <p>Монгол Улсын хуулиар зөвшөөрөгдөх хэмжээнд:</p>
                <ul>
                    <li>Бид манай вэбсайтын тасалдал, технологийн алдаа, гуравдагч тал эсвэл байгалийн хүчин зүйлсийн улмаас үүссэн шууд бус хохирлыг хариуцахгүй.</li>
                    <li>Захиалга боловсруулах, хүргэлтийн саатал зэрэг хяналтаасаа гадуурх тохиолдолд хариуцлага хүлээхгүй.</li>
                    <li>Манай нийт хариуцлага тухайн захиалгын нийт дүнгээс хэтрэхгүй.</li>
                </ul>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s10">
                <p class="legal-section-number">10</p>
                <h3>Маргаан шийдвэрлэх</h3>
                <p>Манай үйлчилгээтэй холбоотой маргаан гарсан тохиолдолд:</p>
                <ol>
                    <li>Эхлээд бидэнтэй шууд холбоо барьж асуудлыг шийдвэрлэхийг хичээнэ үү.</li>
                    <li>Шийдэл гараагүй тохиолдолд Монгол Улсын Хэрэглэгчийн эрхийг хамгаалах байгуулллагад хандах боломжтой.</li>
                    <li>Хуулийн маргаан нь Монгол Улсын шүүхийн харьяалалд хамаарна.</li>
                </ol>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s11">
                <p class="legal-section-number">11</p>
                <h3>Нөхцөлийн өөрчлөлт</h3>
                <p>Бид энэхүү нөхцөлийг цаг үе тутам шинэчилж болно. Томоохон өөрчлөлт орсон тохиолдолд бүртгэлтэй хэрэглэгчдэд имэйлээр мэдэгдэл явуулна. Өөрчлөлт нийтлэгдсэний дараа сайтыг үргэлжлүүлэн ашигласнаар та шинэ нөхцөлийг зөвшөөрч байна.</p>
            </section>

            <hr class="legal-divider">

            <section class="legal-section" id="terms-s12">
                <p class="legal-section-number">12</p>
                <h3>Холбоо барих</h3>
                <p>Үйлчилгээний нөхцөлтэй холбоотой асуулт байвал:</p>
                <ul>
                    <li><strong>Имэйл:</strong> una.furniture@outlook.com</li>
                    <li><strong>Вэбсайт:</strong> unafurniture.com</li>
                    <li><strong>Ажлын цаг:</strong> Даваа–Баасан 09:00–18:00, Бямба 10:00–16:00</li>
                </ul>
            </section>

            <div class="legal-contact-card">
                <p>Асуулт, санал хүсэлт байвал бидэнтэй холбоо барина уу</p>
                <a href="mailto:una.furniture@outlook.com">una.furniture@outlook.com</a>
            </div>
        </div>
    `;

    function getElements() {
        return {
            overlay: document.getElementById('legal-overlay'),
            modal: document.getElementById('legal-modal'),
            title: document.getElementById('modal-title'),
            body: document.querySelector('#legal-modal .modal-body'),
            privacyTab: document.getElementById('tab-privacy'),
            termsTab: document.getElementById('tab-terms'),
            privacyPanel: document.getElementById('panel-privacy'),
            termsPanel: document.getElementById('panel-terms')
        };
    }

    function injectLegalModal() {
        if (document.getElementById('legal-overlay')) return;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div id="legal-overlay" aria-hidden="true" hidden>
                <div id="legal-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
                    <div class="modal-header">
                        <div class="modal-header-content">
                            <p class="legal-eyebrow">Хуулийн баримт бичиг</p>
                            <h2 id="modal-title">Нууцлалын бодлого</h2>
                            <span>${LEGAL_UPDATED_LABEL}</span>
                        </div>
                        <button class="modal-close" type="button" aria-label="Хаах">&times;</button>
                    </div>
                    <div class="modal-tabs" role="tablist" aria-label="Legal documents">
                        <button id="tab-privacy" type="button" role="tab" data-tab="privacy">Нууцлалын бодлого</button>
                        <button id="tab-terms" type="button" role="tab" data-tab="terms">Үйлчилгээний нөхцөл</button>
                    </div>
                    <div class="modal-body">
                        <div id="panel-privacy" role="tabpanel">${privacyContent}</div>
                        <div id="panel-terms" role="tabpanel">${termsContent}</div>
                    </div>
                    <div class="modal-footer">
                        <span>unafurniture.com &middot; 2026</span>
                        <button id="btn-accept" type="button">Зөвшөөрч хаах</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper.firstElementChild);
    }

    function switchTab(tab = 'privacy') {
        injectLegalModal();
        const activeTab = tab === 'terms' ? 'terms' : 'privacy';
        const { title, body, privacyTab, termsTab, privacyPanel, termsPanel } = getElements();

        title.textContent = activeTab === 'privacy' ? 'Нууцлалын бодлого' : 'Үйлчилгээний нөхцөл';
        privacyTab.classList.toggle('is-active', activeTab === 'privacy');
        termsTab.classList.toggle('is-active', activeTab === 'terms');
        privacyTab.setAttribute('aria-selected', String(activeTab === 'privacy'));
        termsTab.setAttribute('aria-selected', String(activeTab === 'terms'));
        privacyPanel.hidden = activeTab !== 'privacy';
        termsPanel.hidden = activeTab !== 'terms';

        if (body) body.scrollTop = 0;
    }

    function openLegalModal(tab = 'privacy') {
        injectLegalModal();
        const { overlay, modal } = getElements();

        switchTab(tab);
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        overlay.removeAttribute('inert');

        window.requestAnimationFrame(() => {
            overlay.classList.add('is-open');
        });

        window.requestAnimationFrame(() => {
            modal?.focus({ preventScroll: true });
        });
    }

    function closeModal(accepted = false) {
        const { overlay } = getElements();
        if (!overlay) return;

        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
        document.body.style.overflow = previousBodyOverflow;

        window.setTimeout(() => {
            if (!overlay.classList.contains('is-open')) {
                overlay.hidden = true;
            }
        }, 240);

        if (accepted && (window.location.pathname.endsWith('signup.html') || window.location.pathname.endsWith('/signup') || document.getElementById('signupForm'))) {
            const agreeCheckbox = document.getElementById('agree-checkbox');
            if (agreeCheckbox) agreeCheckbox.checked = true;
        }
    }

    function scrollPanelToSection(anchor) {
        const selector = String(anchor || '');
        if (!selector.startsWith('#')) return;

        const target = document.querySelector(selector);
        const { body } = getElements();
        if (!target || !body) return;

        body.scrollTo({
            top: target.offsetTop - body.offsetTop - 12,
            behavior: 'smooth'
        });
    }

    function bindLegalModalEvents() {
        injectLegalModal();

        document.addEventListener('click', (event) => {
            const legalLink = event.target.closest('[data-legal-tab]');
            if (legalLink) {
                event.preventDefault();
                openLegalModal(legalLink.dataset.legalTab);
                return;
            }

            const tocLink = event.target.closest('#legal-modal .legal-toc a[href^="#"]');
            if (tocLink) {
                event.preventDefault();
                scrollPanelToSection(tocLink.getAttribute('href'));
                return;
            }

            if (event.target.closest('.modal-close')) {
                closeModal(false);
                return;
            }

            if (event.target.closest('#btn-accept')) {
                closeModal(true);
                return;
            }

            if (event.target.id === 'legal-overlay') {
                closeModal(false);
                return;
            }

            const tabButton = event.target.closest('.modal-tabs button[data-tab]');
            if (tabButton) {
                switchTab(tabButton.dataset.tab);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeModal(false);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindLegalModalEvents, { once: true });
    } else {
        bindLegalModalEvents();
    }

    window.openLegalModal = openLegalModal;
    window.closeModal = closeModal;
    window.switchTab = switchTab;
})();
