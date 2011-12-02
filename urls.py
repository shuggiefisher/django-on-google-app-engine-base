from django.conf.urls.defaults import *
from django.contrib import admin

admin.autodiscover()

handler500 = 'djangotoolbox.errorviews.server_error'

urlpatterns = patterns('',
    ('^_ah/warmup$', 'djangoappengine.views.warmup'),
    url('^$', 'django.views.generic.simple.direct_to_template', {'template': 'home.html'}, name='home'),
    (r'^admin/', include(admin.site.urls)),
)
