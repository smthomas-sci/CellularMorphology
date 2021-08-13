#Need module 're' for regular expression
import re
#

STRINGS = ["There is chronic inflammation in the underlying dermis",
           "There is moderate inflammation in the underlying dermis",
           "There is thickening of the epidermis with mildly dysplastic keratinocytes with the basal layer unaffected in parts",
           "Thick basket weave keratosis with focal parakeratosis",
           "Thick parakeratosis accompanying basket weave keratosis",
           "Thick parakeratosis covering the entire section",
           "Thin basket weave keratosis overlaying a granular layer",
           "Thin basket weave keratosis with focal parakeratosis",
           "Thin basket weave keratosis with focal parakeratosis overlays an abnormal granular layer",
           "Thin layers of basket weave keratin overlay a disrupted granular layer",
           "Chronic inflammation underlies the epidermis"
]

pattern = ".*basket"
for search_string in STRINGS:
   match = re.match(pattern, search_string)
   if match:
      #print(match)
      print("regex matches: ", search_string, match.start())